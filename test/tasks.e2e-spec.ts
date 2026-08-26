import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';

describe('Tasks — create/list/get (e2e)', () => {
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

  it('creates a task defaulting to open status, description optional', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Reporte mensual' })
      .expect(201);

    expect(res.body).toMatchObject({ title: 'Reporte mensual', description: null, status: 'open' });
    expect(typeof res.body.id).toBe('number');
  });

  it('rejects a task without a title', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .send({ description: 'sin titulo' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for a nonexistent task', async () => {
    const res = await request(app.getHttpServer()).get('/tasks/999').expect(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('lists tasks filtered by status', async () => {
    await request(app.getHttpServer()).post('/tasks').send({ title: 'Open task' }).expect(201);

    const openOnly = await request(app.getHttpServer()).get('/tasks?status=open').expect(200);
    expect(openOnly.body).toHaveLength(1);

    const archivedOnly = await request(app.getHttpServer())
      .get('/tasks?status=archived')
      .expect(200);
    expect(archivedOnly.body).toHaveLength(0);
  });

  it('rejects an invalid status filter', async () => {
    const res = await request(app.getHttpServer()).get('/tasks?status=bogus').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
