import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from 'src/modules/tasks/infrastructure/notifications/notification.service';

/** Clears leftover BullMQ jobs between tests, since `resetDb` only truncates Postgres. */
export async function resetQueue(app: INestApplication): Promise<void> {
  const queue = app.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE));
  await queue.obliterate({ force: true });
}
