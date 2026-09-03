import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from 'src/db/prisma.service';
import { NOTIFICATIONS_QUEUE, NotificationService, NotifyPayload } from './notification.service';

export function parseBackoffsMs(value: string | undefined): number[] {
  return (value ?? '200,500,1000')
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);
}

// El delay antes del intento (attemptNumber + 1).
export function computeBackoffMs(attemptNumber: number): number {
  const steps = parseBackoffsMs(process.env.NOTIFICATION_BACKOFF_MS);
  return steps[attemptNumber - 1] ?? steps[steps.length - 1] ?? 0;
}

// Máximo de intentos totales (1 = primer envío) exigido por el reto.
export const MAX_NOTIFICATION_ATTEMPTS = 3;

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
    this.requestTimeoutMs = Number(
      this.configService.get<string>('NOTIFICATION_TIMEOUT_MS') ?? '5000',
    );
  }

  async process(job: Job<NotifyPayload>): Promise<void> {
    const notifyUrl = this.configService.get<string>('NOTIFY_URL');
    if (!notifyUrl) return;

    const attemptNumber = job.data.attempt;
    const { httpStatus, ok, transientFailure, errorMessage } = await this.sendOnce(
      notifyUrl,
      job.data,
    );
    await this.recordAttempt(job.data.taskId, attemptNumber, httpStatus, ok, errorMessage);

    if (ok) return;
    if (!transientFailure) return;
    if (attemptNumber >= MAX_NOTIFICATION_ATTEMPTS) {
      this.logger.warn(
        `Notification for task ${job.data.taskId} failed after ${attemptNumber} attempts, giving up`,
      );
      return;
    }

    this.logger.warn(
      `Notification attempt ${attemptNumber} for task ${job.data.taskId} failed transiently, scheduling attempt ${attemptNumber + 1}`,
    );
    // Cada job es un único intento (ver notification.service.ts); el reintento se logra encolando un
    // job NUEVO para el siguiente intento en vez de dejar que BullMQ reintente este mismo job.
    await this.notificationService.scheduleRetry(
      { ...job.data, attempt: attemptNumber + 1 },
      computeBackoffMs(attemptNumber),
    );
  }

  private async sendOnce(
    notifyUrl: string,
    payload: NotifyPayload,
  ): Promise<{
    httpStatus: number | null;
    ok: boolean;
    transientFailure: boolean;
    errorMessage: string | null;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return {
        httpStatus: response.status,
        ok: response.ok,
        transientFailure: response.status >= 500,
        errorMessage: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      return { httpStatus: null, ok: false, transientFailure: true, errorMessage: message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordAttempt(
    taskId: number,
    attemptNumber: number,
    httpStatus: number | null,
    success: boolean,
    errorMessage: string | null,
  ) {
    return this.prisma.db.notificationAttempt.create({
      data: { taskId, attemptNumber, httpStatus, success, errorMessage },
    });
  }
}
