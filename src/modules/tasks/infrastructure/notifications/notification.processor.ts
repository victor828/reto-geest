import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from 'src/db/prisma.service';
import { NOTIFICATIONS_QUEUE, NotifyPayload } from './notification.service';

function parseBackoffsMs(value: string | undefined): number[] {
  return (value ?? '200,500,1000')
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);
}

/**
 * Consumes the jobs `NotificationService` enqueues. Each BullMQ retry re-invokes `process()`, so
 * `job.attemptsMade` (0 before the first try) doubles as the attempt counter persisted alongside
 * the outcome in `NotificationAttempt`. Throwing lets BullMQ schedule the next attempt via the
 * `backoffStrategy` below; returning normally — success or a non-transient failure — settles the
 * job with no further retries, mirroring the previous inline retry loop's behavior.
 *
 * `backoffStrategy` is invoked directly by BullMQ, outside Nest's DI, only once a job actually
 * fails — by then the app has long finished bootstrapping and `.env` is loaded, so reading
 * `process.env` here (instead of the injected `ConfigService`) is safe and avoids wiring instance
 * state into a function BullMQ calls independently of any particular instance.
 */
@Processor(NOTIFICATIONS_QUEUE, {
  settings: {
    backoffStrategy: (attemptsMade: number) =>
      parseBackoffsMs(process.env.NOTIFICATION_BACKOFF_MS)[attemptsMade - 1] ?? 0,
  },
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.requestTimeoutMs = Number(
      this.configService.get<string>('NOTIFICATION_TIMEOUT_MS') ?? '5000',
    );
  }

  async process(job: Job<NotifyPayload>): Promise<void> {
    const notifyUrl = this.configService.get<string>('NOTIFY_URL');
    if (!notifyUrl) return;

    const attemptNumber = job.attemptsMade + 1;
    const { httpStatus, ok, transientFailure, errorMessage } = await this.sendOnce(
      notifyUrl,
      job.data,
    );
    await this.recordAttempt(job.data.taskId, attemptNumber, httpStatus, ok, errorMessage);

    if (ok) return;
    if (!transientFailure) return;

    this.logger.warn(
      `Notification attempt ${attemptNumber} for task ${job.data.taskId} failed transiently`,
    );
    throw new Error(errorMessage ?? `Notification failed with HTTP ${httpStatus}`);
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
