import { INestApplication } from '@nestjs/common';
import nock from 'nock';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';

describe('Notification retries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
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

    const attempts = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/notifications`)
      .expect(200);
    expect(attempts.body).toHaveLength(3);
    expect(attempts.body.map((a: { attemptNumber: number }) => a.attemptNumber)).toEqual([1, 2, 3]);
    expect(attempts.body[0]).toMatchObject({ httpStatus: 500, success: false });
    expect(attempts.body[1]).toMatchObject({ httpStatus: 500, success: false });
    expect(attempts.body[2]).toMatchObject({ httpStatus: 200, success: true });
  });

  it('stops after exhausting 3 attempts when the destination keeps failing, without failing the request', async () => {
    nock('http://localhost:4000').post('/notify').times(3).reply(500);

    const { taskId, userId } = await createArchivableTask('Always failing');
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(200);

    expect(res.body.task.status).toBe('archived');

    const attempts = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/notifications`)
      .expect(200);
    expect(attempts.body).toHaveLength(3);
    expect(attempts.body.every((a: { success: boolean }) => a.success === false)).toBe(true);
  });

  it('does not retry on a non-transient 4xx response', async () => {
    nock('http://localhost:4000').post('/notify').reply(400);

    const { taskId, userId } = await createArchivableTask('Client error, no retry');
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(200);

    const attempts = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/notifications`)
      .expect(200);
    expect(attempts.body).toHaveLength(1);
    expect(attempts.body[0]).toMatchObject({ httpStatus: 400, success: false });
  });
});
