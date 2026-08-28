import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';

describe('Users (e2e)', () => {
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

  it('registers a user and returns its id and data', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ana', lastName: 'Perez', email: 'ana@example.com' })
      .expect(201);

    expect(res.body).toMatchObject({ name: 'Ana', lastName: 'Perez', email: 'ana@example.com' });
    expect(typeof res.body.id).toBe('number');
  });

  it('rejects a request missing required fields', async () => {
    const res = await request(app.getHttpServer()).post('/users').send({ name: 'Ana' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid email', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ana', lastName: 'Perez', email: 'not-an-email' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists users with their pending tasks, paginated', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ana', lastName: 'Perez', email: 'ana@example.com' })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/users').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(res.body.data[0]).toMatchObject({ name: 'Ana', pendingTasks: [] });
  });

  it('paginates the users list', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ana', lastName: 'Perez', email: 'ana@example.com' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Bea', lastName: 'Lopez', email: 'bea@example.com' })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/users?page=2&limit=1').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it('returns 404 when listing tasks for a nonexistent user', async () => {
    const res = await request(app.getHttpServer()).get('/users/999/tasks').expect(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });
});
