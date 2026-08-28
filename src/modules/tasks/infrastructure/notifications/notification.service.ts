import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { TaskEntity } from '../../domain/entities/task.entity';

export interface NotifyPayload {
  taskId: number;
  title: string;
  archivedAt: string;
}

export const NOTIFICATIONS_QUEUE = 'notifications';
export const NOTIFY_ARCHIVED_JOB = 'archived';

function parseBackoffsMs(value: string | undefined): number[] {
  return (value ?? '200,500,1000')
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);
}

/**
 * Enqueues the archived-task webhook as a durable BullMQ job instead of sending it inline: the
 * job survives a process restart mid-retry, and the HTTP response for `/complete` no longer waits
 * on the webhook's retry cycle. Always called AFTER the archiving transaction has committed (see
 * PostCommitHooks), so a slow/failing NOTIFY_URL never holds DB locks or risks the archival itself.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifyUrl?: string;
  private readonly backoffsMs: number[];

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotifyPayload>,
    private readonly configService: ConfigService,
  ) {
    this.notifyUrl = this.configService.get<string>('NOTIFY_URL');
    this.backoffsMs = parseBackoffsMs(this.configService.get<string>('NOTIFICATION_BACKOFF_MS'));
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

    try {
      await this.queue.add(NOTIFY_ARCHIVED_JOB, payload, {
        attempts: this.backoffsMs.length || 1,
        backoff: { type: 'custom' },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (err) {
      // Archiving already committed by the time we get here — a broken queue must never fail
      // the HTTP response for work that already succeeded.
      this.logger.error(`Failed to enqueue notification for task ${task.id}`, err as Error);
    }
  }
}
