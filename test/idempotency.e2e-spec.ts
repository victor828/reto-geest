import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/db/prisma.service';
import { createTestApp } from './utils/test-app';
import { resetDb } from './utils/reset-db';

describe('Idempotency-Key (e2e)', () => {
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

  it('executes the operation once and returns identical responses for two sequential requests with the same key', async () => {
    const body = { title: 'Idempotent task' };
    const first = await request(app.getHttpServer())
      .post('/tasks')
      .set('Idempotency-Key', 'seq-key-1')
      .send(body)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/tasks')
      .set('Idempotency-Key', 'seq-key-1')
      .send(body)
      .expect(201);

    expect(second.body).toEqual(first.body);

    const tasks = await prisma.task.findMany({ where: { title: 'Idempotent task' } });
    expect(tasks).toHaveLength(1);
  });

  it('executes the operation exactly once for two concurrent requests with the same key', async () => {
    const body = { title: 'Concurrent idempotent task' };
    const [first, second] = await Promise.all([
      request(app.getHttpServer()).post('/tasks').set('Idempotency-Key', 'par-key-1').send(body),
      request(app.getHttpServer()).post('/tasks').set('Idempotency-Key', 'par-key-1').send(body),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const tasks = await prisma.task.findMany({ where: { title: 'Concurrent idempotent task' } });
    expect(tasks).toHaveLength(1);
  });

  it('rejects reusing the same key with a different request body', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Idempotency-Key', 'reused-key')
      .send({ title: 'First body' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Idempotency-Key', 'reused-key')
      .send({ title: 'Different body' })
      .expect(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('allows reusing the same key across different endpoints', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Idempotency-Key', 'shared-key')
      .send({ title: 'Task via shared key' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/users')
      .set('Idempotency-Key', 'shared-key')
      .send({ name: 'Ana', lastName: 'Gomez', email: 'ana@example.com' })
      .expect(201);
  });

  it('executes the operation twice when no Idempotency-Key is sent', async () => {
    const body = { title: 'No key task' };
    await request(app.getHttpServer()).post('/tasks').send(body).expect(201);
    await request(app.getHttpServer()).post('/tasks').send(body).expect(201);

    const tasks = await prisma.task.findMany({ where: { title: 'No key task' } });
    expect(tasks).toHaveLength(2);
  });
});
