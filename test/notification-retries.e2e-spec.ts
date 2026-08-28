import { INestApplication } from '@nestjs/common';
import nock from 'nock';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';
import { resetQueue } from './utils/reset-queue';
import { waitFor } from './utils/wait-for';

describe('Notification retries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await resetQueue(app);
    nock.cleanAll();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createArchivableTask(title: string): Promise<{ taskId: number; userId: number }> {
    const emailSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userRes = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Retry', lastName: 'Tester', email: `${emailSlug}@example.com` });
    const userId: number = userRes.body.id;

    const taskRes = await request(app.getHttpServer()).post('/tasks').send({ title });
    const taskId: number = taskRes.body.id;
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [userId] })
      .expect(200);

    return { taskId, userId };
  }

  async function getNotifications(taskId: number) {
    const res = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/notifications`)
      .expect(200);
    return res.body as Array<{
      attemptNumber: number;
      httpStatus: number | null;
      success: boolean;
    }>;
  }

  /** The worker processes the job on Redis after the HTTP response returns, so tests poll for it. */
  async function waitForAttempts(taskId: number, count: number) {
    let attempts: Array<{ attemptNumber: number; httpStatus: number | null; success: boolean }> =
      [];
    await waitFor(async () => {
      attempts = await getNotifications(taskId);
      return attempts.length >= count;
    });
    return attempts;
  }

  it('retries up to 3 times on 5xx responses and stops once the destination succeeds', async () => {
    nock('http://localhost:4000')
      .post('/notify')
      .reply(500)
      .post('/notify')
      .reply(500)
      .post('/notify')
      .reply(200);

    const { taskId, userId } = await createArchivableTask('Retry then succeed');
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(200);

    const attempts = await waitForAttempts(taskId, 3);
    expect(attempts).toHaveLength(3);
    expect(attempts.map((a) => a.attemptNumber)).toEqual([1, 2, 3]);
    expect(attempts[0]).toMatchObject({ httpStatus: 500, success: false });
    expect(attempts[1]).toMatchObject({ httpStatus: 500, success: false });
    expect(attempts[2]).toMatchObject({ httpStatus: 200, success: true });
  });

  it('stops after exhausting 3 attempts when the destination keeps failing, without failing the request', async () => {
    nock('http://localhost:4000').post('/notify').times(3).reply(500);

    const { taskId, userId } = await createArchivableTask('Always failing');
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(200);

    expect(res.body.task.status).toBe('archived');

    const attempts = await waitForAttempts(taskId, 3);
    expect(attempts).toHaveLength(3);
    expect(attempts.every((a) => a.success === false)).toBe(true);
  });

  it('does not retry on a non-transient 4xx response', async () => {
    nock('http://localhost:4000').post('/notify').reply(400);

    const { taskId, userId } = await createArchivableTask('Client error, no retry');
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(200);

    const attempts = await waitForAttempts(taskId, 1);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ httpStatus: 400, success: false });
  });
});
