import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { computeBackoffMs, NotificationProcessor } from './notification.processor';
import { NotificationService, NotifyPayload } from './notification.service';
import { PrismaService } from 'src/db/prisma.service';

function makePayload(attempt: number): NotifyPayload {
  return { taskId: 1, title: 'Write report', archivedAt: '2024-01-02T00:00:00.000Z', attempt };
}

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

function makeNotificationService(): jest.Mocked<NotificationService> {
  return {
    scheduleRetry: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationService>;
}

function makeJob(attempt: number): Job<NotifyPayload> {
  return { data: makePayload(attempt) } as Job<NotifyPayload>;
}

describe('computeBackoffMs', () => {
  const originalEnv = process.env.NOTIFICATION_BACKOFF_MS;

  afterEach(() => {
    process.env.NOTIFICATION_BACKOFF_MS = originalEnv;
  });

  it('grows through the configured steps and then plateaus at the last one', () => {
    process.env.NOTIFICATION_BACKOFF_MS = '200,500,1000';

    expect(computeBackoffMs(1)).toBe(200);
    expect(computeBackoffMs(2)).toBe(500);
    expect(computeBackoffMs(3)).toBe(1000);
    expect(computeBackoffMs(4)).toBe(1000);
    expect(computeBackoffMs(50)).toBe(1000);
  });
});

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
    const notificationService = makeNotificationService();
    const processor = new NotificationProcessor(
      makeConfigService({ NOTIFY_URL: undefined }),
      prisma,
      notificationService,
    );

    await processor.process(makeJob(1));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.db.notificationAttempt.create).not.toHaveBeenCalled();
  });

  it('records a successful attempt and does not schedule a retry', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const notificationService = makeNotificationService();
    const processor = new NotificationProcessor(makeConfigService(), prisma, notificationService);

    await expect(processor.process(makeJob(1))).resolves.toBeUndefined();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 1, httpStatus: 200, success: true, errorMessage: null },
    });
    expect(notificationService.scheduleRetry).not.toHaveBeenCalled();
  });

  it('records the attempt and schedules attempt+1 on a transient (5xx) failure, without throwing', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 503, ok: false });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const notificationService = makeNotificationService();
    const processor = new NotificationProcessor(makeConfigService(), prisma, notificationService);

    await expect(processor.process(makeJob(2))).resolves.toBeUndefined();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 2, httpStatus: 503, success: false, errorMessage: null },
    });
    expect(notificationService.scheduleRetry).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 1, attempt: 3 }),
      expect.any(Number),
    );
  });

  it('records the attempt and does not schedule a retry on a non-transient (4xx) failure', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 400, ok: false });
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const notificationService = makeNotificationService();
    const processor = new NotificationProcessor(makeConfigService(), prisma, notificationService);

    await expect(processor.process(makeJob(1))).resolves.toBeUndefined();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: { taskId: 1, attemptNumber: 1, httpStatus: 400, success: false, errorMessage: null },
    });
    expect(notificationService.scheduleRetry).not.toHaveBeenCalled();
  });

  it('records a network error and schedules the next attempt, without throwing', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchMock;
    const prisma = makePrismaService();
    const notificationService = makeNotificationService();
    const processor = new NotificationProcessor(makeConfigService(), prisma, notificationService);

    await expect(processor.process(makeJob(1))).resolves.toBeUndefined();

    expect(prisma.db.notificationAttempt.create).toHaveBeenCalledWith({
      data: {
        taskId: 1,
        attemptNumber: 1,
        httpStatus: null,
        success: false,
        errorMessage: 'network down',
      },
    });
    expect(notificationService.scheduleRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 2 }),
      expect.any(Number),
    );
  });
});
