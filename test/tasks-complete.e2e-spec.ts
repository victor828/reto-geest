import { INestApplication } from '@nestjs/common';
import nock from 'nock';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';
import { resetQueue } from './utils/reset-queue';
import { waitFor } from './utils/wait-for';

describe('Tasks — complete & archive (e2e)', () => {
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

  async function createUser(email: string) {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'User', lastName: email, email })
      .expect(201);
    return res.body.id as number;
  }

  async function createTask(title: string) {
    const res = await request(app.getHttpServer()).post('/tasks').send({ title }).expect(201);
    return res.body.id as number;
  }

  it('marks a single user as completed without archiving while others remain pending', async () => {
    const [u1, u2] = await Promise.all([
      createUser('u1@example.com'),
      createUser('u2@example.com'),
    ]);
    const taskId = await createTask('Two-person task');
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [u1, u2] })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId: u1 })
      .expect(200);

    expect(res.body.task.status).toBe('open');
    expect(res.body.task.assignees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: u1, completed: true }),
        expect.objectContaining({ userId: u2, completed: false }),
      ]),
    );
  });

  it('archives the task and notifies NOTIFY_URL once everyone has completed', async () => {
    const scope = nock('http://localhost:4000')
      .post('/notify', (body) => body.taskId !== undefined && body.title === 'Solo task')
      .reply(200, { ok: true });

    const userId = await createUser('solo@example.com');
    const taskId = await createTask('Solo task');
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [userId] })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(200);

    expect(res.body.task.status).toBe('archived');
    expect(res.body.task.archivedAt).toBeTruthy();

    // The webhook now fires from a BullMQ worker after the response returns: nock's scope flips
    // isDone() as soon as it intercepts the request, before our own DB write commits, so poll the
    // persisted attempt itself rather than the mock.
    let notifications: request.Response | undefined;
    await waitFor(async () => {
      notifications = await request(app.getHttpServer()).get(`/tasks/${taskId}/notifications`);
      return notifications.body.length >= 1;
    });
    expect(scope.isDone()).toBe(true);
    expect(notifications!.status).toBe(200);
    expect(notifications!.body).toHaveLength(1);
    expect(notifications!.body[0]).toMatchObject({
      attemptNumber: 1,
      httpStatus: 200,
      success: true,
    });
  });

  it('rejects completing a task for a user that is not assigned', async () => {
    const userId = await createUser('notassigned@example.com');
    const taskId = await createTask('No assignment');

    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId })
      .expect(400);
    expect(res.body.error.code).toBe('USER_NOT_ASSIGNED');
  });

  it('rejects completing for a nonexistent task or user', async () => {
    const userId = await createUser('exists@example.com');

    const missingTask = await request(app.getHttpServer())
      .post('/tasks/999/complete')
      .send({ userId })
      .expect(404);
    expect(missingTask.body.error.code).toBe('TASK_NOT_FOUND');

    const taskId = await createTask('Task with missing user');
    const missingUser = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/complete`)
      .send({ userId: 999 })
      .expect(404);
    expect(missingUser.body.error.code).toBe('USER_NOT_FOUND');
  });
});
