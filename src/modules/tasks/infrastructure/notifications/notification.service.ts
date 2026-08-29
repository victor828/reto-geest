import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { TaskEntity } from '../../domain/entities/task.entity';

export interface NotifyPayload {
  taskId: number;
  title: string;
  archivedAt: string;
  /** Número del intento que representa este job (1 = primer envío). */
  attempt: number;
}

export const NOTIFICATIONS_QUEUE = 'notifications';
export const NOTIFY_ARCHIVED_JOB = 'archived';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifyUrl?: string;

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<NotifyPayload>,
    private readonly configService: ConfigService,
  ) {
    this.notifyUrl = this.configService.get<string>('NOTIFY_URL');
  }

  async notifyArchived(task: TaskEntity): Promise<void> {
    if (!this.notifyUrl) {
      this.logger.warn(`NOTIFY_URL is not configured, skipping notification for task ${task.id}`);
      return;
    }

    await this.enqueue(
      {
        taskId: task.id,
        title: task.title,
        archivedAt: (task.archivedAt ?? new Date()).toISOString(),
        attempt: 1,
      },
      0,
    );
  }

  /**
   * Encola el siguiente intento de notificación. Usado tanto por el primer envío como por
   * NotificationProcessor para reintentar indefinidamente (ver esa clase) — deliberadamente NO se
   * inyecta el Queue directamente en el Processor: hacerlo desde la misma clase que es el propio
   * @Processor/Worker le corta el loop de consumo tras el primer job (se descubrió al implementar
   * esto: el worker dejaba de recibir jobs nuevos, incluida su propia cadena de reintentos).
   */
  async scheduleRetry(payload: NotifyPayload, delayMs: number): Promise<void> {
    await this.enqueue(payload, delayMs);
  }

  private async enqueue(payload: NotifyPayload, delayMs: number): Promise<void> {
    try {
      // attempts:1 a propósito: cada job es un único intento que siempre llega a un estado terminal
      // real. Los reintentos, si hacen falta, los encola este mismo método de nuevo (ver
      // NotificationProcessor) — decisión de producto para reintentar indefinidamente hasta entregar
      // la notificación, en vez de apoyarse en el conteo interno de intentos de BullMQ (que no está
      // pensado para valores enormes/infinitos, ver historial de esta sesión).
      await this.queue.add(NOTIFY_ARCHIVED_JOB, payload, {
        delay: delayMs,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      });
    } catch (err) {
      this.logger.error(
        `Failed to schedule notification attempt ${payload.attempt} for task ${payload.taskId}`,
        err as Error,
      );
    }
  }
}
