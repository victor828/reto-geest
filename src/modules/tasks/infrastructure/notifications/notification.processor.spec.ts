import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { NotificationProcessor } from './notification.processor';
import { NotifyPayload } from './notification.service';
import { PrismaService } from 'src/db/prisma.service';

const payload: NotifyPayload = {
  taskId: 1,
  title: 'Write report',
  archivedAt: '2024-01-02T00:00:00.000Z',
};

function makeConfigService(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values: Record<string, string | undefined> = {
    NOTIFY_URL: 'https://hooks.example.com/notify',
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

function makeJob(attemptsMade: number): Job<NotifyPayload> {
  return { data: payload, attemptsMade } as Job<NotifyPayload>;
}

describe('NotificationProcessor', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('does nothing when NOTIFY_URL is not configured', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const processor = new NotificationProcessor(
      makeConfigService({ NOTIFY_URL: undefined }),
      prisma,
    );

    await processor.process(makeJob(0));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.db.notificationAttempt.create).not.toHaveBeenCalled();
  });

  it('records a successful attempt and does not throw', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const processor = new NotificationProcessor(makeConfigService(), prisma);

    await expect(processor.process(makeJob(0))).resolves.toBeUndefined();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 1, httpStatus: 200, success: true, errorMessage: null },
    });
  });

  it('records the attempt and throws on a transient (5xx) failure, so BullMQ retries', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 503, ok: false });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const processor = new NotificationProcessor(makeConfigService(), prisma);

    await expect(processor.process(makeJob(1))).rejects.toThrow();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 2, httpStatus: 503, success: false, errorMessage: null },
    });
  });

  it('records the attempt and does not throw on a non-transient (4xx) failure', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 400, ok: false });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const processor = new NotificationProcessor(makeConfigService(), prisma);

    await expect(processor.process(makeJob(0))).resolves.toBeUndefined();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 1, httpStatus: 400, success: false, errorMessage: null },
    });
  });

  it('records a network error and throws so BullMQ retries', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const processor = new NotificationProcessor(makeConfigService(), prisma);

    await expect(processor.process(makeJob(0))).rejects.toThrow('network down');

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: {
        taskId: 1,
        attemptNumber: 1,
        httpStatus: null,
        success: false,
        errorMessage: 'network down',
      },
    });
  });
});
