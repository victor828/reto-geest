import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';

describe('Tasks — assign (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
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

  it('assigns users to a task', async () => {
    const userId = await createUser('a@example.com');
    const taskId = await createTask('Task A');

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [userId] })
      .expect(200);

    const task = await request(app.getHttpServer()).get(`/tasks/${taskId}`).expect(200);
    expect(task.body.assignees).toEqual([expect.objectContaining({ userId, completed: false })]);
  });

  it('does not duplicate the relation when assigning an already-assigned user', async () => {
    const userId = await createUser('b@example.com');
    const taskId = await createTask('Task B');

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [userId] })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [userId] })
      .expect(200);

    const task = await request(app.getHttpServer()).get(`/tasks/${taskId}`).expect(200);
    expect(task.body.assignees).toHaveLength(1);
  });

  it('rejects assigning to a nonexistent task', async () => {
    const userId = await createUser('c@example.com');
    const res = await request(app.getHttpServer())
      .post('/tasks/999/assign')
      .send({ userIds: [userId] })
      .expect(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('rejects assigning a nonexistent user', async () => {
    const taskId = await createTask('Task C');
    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/assign`)
      .send({ userIds: [999] })
      .expect(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });
});
