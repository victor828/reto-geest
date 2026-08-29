import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from 'src/modules/tasks/infrastructure/notifications/notification.service';

/**
 * Clears leftover BullMQ jobs between tests, since `resetDb` only truncates Postgres.
 * Deliberately avoids `queue.obliterate()`: it tears down the queue's Redis structures wholesale,
 * which desyncs the app's own already-running Worker (BullMQ explicitly warns against obliterating
 * while workers are active) and leaves it unable to process anything added afterwards for the rest
 * of the test file. Draining + cleaning removes leftover jobs without touching that live state.
 */
export async function resetQueue(app: INestApplication): Promise<void> {
  const queue = app.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE));
  await queue.drain(true);
  await queue.clean(0, 0, 'completed');
  await queue.clean(0, 0, 'failed');
}
