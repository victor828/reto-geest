import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/db/prisma.service';
import { TaskEntity } from '../../domain/entities/task.entity';

interface NotifyPayload {
  taskId: number;
  title: string;
  archivedAt: string;
}

/**
 * Sends the archived-task webhook with bounded retries. Always called AFTER the archiving
 * transaction has committed (see PrismaService.runTopLevelTransaction / PostCommitHooks), so a
 * slow or failing NOTIFY_URL never holds DB locks and never risks the archival itself.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifyUrl?: string;
  private readonly backoffsMs: number[];
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.notifyUrl = this.configService.get<string>('NOTIFY_URL');
    this.backoffsMs = (this.configService.get<string>('NOTIFICATION_BACKOFF_MS') ?? '200,500,1000')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0);
    this.requestTimeoutMs = Number(
      this.configService.get<string>('NOTIFICATION_TIMEOUT_MS') ?? '5000',
    );
  }

  async notifyArchived(task: TaskEntity): Promise<void> {
    if (!this.notifyUrl) {
      this.logger.warn(`NOTIFY_URL is not configured, skipping notification for task ${task.id}`);
      return;
    }

    const payload: NotifyPayload = {
      taskId: task.id,
      title: task.title,
      archivedAt: (task.archivedAt ?? new Date()).toISOString(),
    };

    const maxAttempts = this.backoffsMs.length || 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { httpStatus, ok, transientFailure, errorMessage } = await this.sendOnce(payload);
      await this.recordAttempt(task.id, attempt, httpStatus, ok, errorMessage);

      if (ok || !transientFailure) return;
      if (attempt < maxAttempts) await this.sleep(this.backoffsMs[attempt - 1]);
    }

    this.logger.error(`Notification for task ${task.id} exhausted all retry attempts`);
  }

  private async sendOnce(payload: NotifyPayload): Promise<{
    httpStatus: number | null;
    ok: boolean;
    transientFailure: boolean;
    errorMessage: string | null;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(this.notifyUrl!, {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
