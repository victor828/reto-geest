import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { NotificationService, NOTIFY_ARCHIVED_JOB } from './notification.service';
import { TaskEntity } from '../../domain/entities/task.entity';

const task: TaskEntity = {
  id: 1,
  title: 'Write report',
  description: null,
  status: 'archived',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  archivedAt: new Date('2024-01-02T00:00:00.000Z'),
};

function makeConfigService(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values: Record<string, string | undefined> = {
    NOTIFY_URL: 'https://hooks.example.com/notify',
    NOTIFICATION_BACKOFF_MS: '200,500,1000',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function makeQueue(): jest.Mocked<Queue> {
  return { add: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<Queue>;
}

describe('NotificationService', () => {
  it('skips enqueueing when NOTIFY_URL is not configured', async () => {
    const queue = makeQueue();
    const service = new NotificationService(queue, makeConfigService({ NOTIFY_URL: undefined }));

    await service.notifyArchived(task);

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('enqueues an archived-task job as attempt 1, single-shot per job, with no delay', async () => {
    const queue = makeQueue();
    const service = new NotificationService(queue, makeConfigService());

    await service.notifyArchived(task);

    expect(queue.add).toHaveBeenCalledWith(
      NOTIFY_ARCHIVED_JOB,
      { taskId: 1, title: 'Write report', archivedAt: task.archivedAt!.toISOString(), attempt: 1 },
      expect.objectContaining({ attempts: 1, delay: 0 }),
    );
  });

  it('logs and does not throw when the queue itself fails to enqueue', async () => {
    const queue = makeQueue();
    queue.add.mockRejectedValueOnce(new Error('redis down'));
    const service = new NotificationService(queue, makeConfigService());

    await expect(service.notifyArchived(task)).resolves.toBeUndefined();
  });

  it('schedules a retry job with the given delay and attempt number', async () => {
    const queue = makeQueue();
    const service = new NotificationService(queue, makeConfigService());
    const payload = { taskId: 1, title: 'Write report', archivedAt: '2024-01-02T00:00:00.000Z', attempt: 2 };

    await service.scheduleRetry(payload, 500);

    expect(queue.add).toHaveBeenCalledWith(
      NOTIFY_ARCHIVED_JOB,
      payload,
      expect.objectContaining({ attempts: 1, delay: 500 }),
    );
  });

  it('logs and does not throw when scheduling a retry fails to enqueue', async () => {
    const queue = makeQueue();
    queue.add.mockRejectedValueOnce(new Error('redis down'));
    const service = new NotificationService(queue, makeConfigService());

    await expect(
      service.scheduleRetry(
        { taskId: 1, title: 'Write report', archivedAt: '2024-01-02T00:00:00.000Z', attempt: 2 },
        500,
      ),
    ).resolves.toBeUndefined();
  });
});
