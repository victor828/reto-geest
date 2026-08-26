import { NotificationService } from './notification.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/db/prisma.service';
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
    NOTIFICATION_BACKOFF_MS: '0,0',
    NOTIFICATION_TIMEOUT_MS: '5000',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function makePrismaService(): jest.Mocked<PrismaService> {
  return {
    db: { notificationAttempt: { create: jest.fn().mockResolvedValue(undefined) } },
  } as unknown as jest.Mocked<PrismaService>;
}

describe('NotificationService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('skips notifying when NOTIFY_URL is not configured', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const service = new NotificationService(makeConfigService({ NOTIFY_URL: undefined }), prisma);

    await service.notifyArchived(task);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.db.notificationAttempt.create).not.toHaveBeenCalled();
  });

  it('records a single successful attempt and does not retry', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const service = new NotificationService(makeConfigService(), prisma);

    await service.notifyArchived(task);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledTimes(1);
    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 1, httpStatus: 200, success: true, errorMessage: null },
    });
  });

  it('retries on a transient (5xx) failure and stops once it succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ status: 503, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const service = new NotificationService(makeConfigService(), prisma);

    await service.notifyArchived(task);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledTimes(2);
    expect(prisma.db.notificationAttempt.create).toHaveBeenNthCalledWith(1, {
      data: { taskId: 1, attemptNumber: 1, httpStatus: 503, success: false, errorMessage: null },
    });
    expect(prisma.db.notificationAttempt.create).toHaveBeenNthCalledWith(2, {
      data: { taskId: 1, attemptNumber: 2, httpStatus: 200, success: true, errorMessage: null },
    });
  });

  it('does not retry a non-transient (4xx) failure', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 400, ok: false });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const service = new NotificationService(makeConfigService(), prisma);

    await service.notifyArchived(task);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledTimes(1);
  });

  it('exhausts all configured attempts when every call fails transiently', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const service = new NotificationService(
      makeConfigService({ NOTIFICATION_BACKOFF_MS: '0,0,0' }),
      prisma,
    );

    await service.notifyArchived(task);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledTimes(3);
    expect(prisma.db.notificationAttempt.create).toHaveBeenNthCalledWith(3, {
      data: {
        taskId: 1,
        attemptNumber: 3,
        httpStatus: null,
        success: false,
        errorMessage: 'network down',
      },
    });
  });
});
