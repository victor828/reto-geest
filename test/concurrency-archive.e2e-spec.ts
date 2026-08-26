import { INestApplication } from '@nestjs/common';
import nock from 'nock';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';

describe('Concurrent completion archives exactly once (e2e)', () => {
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

  it('archives the task exactly once and sends exactly one notification cycle when the last two users complete simultaneously', async () => {
    const notifyCalls: unknown[] = [];
    const scope = nock('http://localhost:4000')
      .post('/notify')
      .reply(200, (_uri, body) => {
        notifyCalls.push(body);
        return { ok: true };
      });

    const [u1Res, u2Res] = await Promise.all([
      request(app.getHttpServer())
        .post('/users')
        .send({ name: 'User', lastName: 'One', email: 'race1@example.com' }),
      request(app.getHttpServer())
        .post('/users')
        .send({ name: 'User', lastName: 'Two', email: 'race2@example.com' }),
    ]);
    const u1: number = u1Res.body.id;
    const u2: number = u2Res.body.id;

    const taskRes = await request(app.getHttpServer()).post('/tasks').send({ title: 'Race task' });
    const taskId: number = taskRes.body.id;
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [u1, u2] })
      .expect(200);

    const [r1, r2] = await Promise.all([
      request(app.getHttpServer()).post(`/tasks/${taskId}/complete`).send({ userId: u1 }),
      request(app.getHttpServer()).post(`/tasks/${taskId}/complete`).send({ userId: u2 }),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    // Each response reflects a fresh read taken right after its own request committed, so
    // whichever request's completion didn't trigger the archive may still observe "open" if its
    // read raced the other request's commit — what must hold is the FINAL persisted state below.

    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    expect(task.status).toBe('archived');

    expect(notifyCalls).toHaveLength(1); // the webhook itself was called exactly once
    expect(scope.isDone()).toBe(true);

    const notifications = await prisma.notificationAttempt.findMany({ where: { taskId } });
    expect(notifications).toHaveLength(1); // exactly one attempt was logged, not one per racing request
  });
});
