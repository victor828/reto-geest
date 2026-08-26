import { CallHandler, ExecutionContext, HttpException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { firstValueFrom, of, throwError } from 'rxjs';
import { PrismaService } from 'src/db/prisma.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IDEMPOTENT_METADATA_KEY } from './idempotent.decorator';

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    idempotencyKey: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>): jest.Mocked<PrismaService> {
  return {
    runTopLevelTransaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
  } as unknown as jest.Mocked<PrismaService>;
}

function makeReflector(metadata: Record<string, unknown>): Reflector {
  return { get: jest.fn((key: string) => metadata[key]) } as unknown as Reflector;
}

function makeContext(request: Record<string, unknown>, response = { status: jest.fn() }) {
  const context = {
    getHandler: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, response };
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    originalUrl: '/tasks',
    body: { title: 'T' },
    header: jest.fn().mockReturnValue('key-123'),
    ...overrides,
  };
}

describe('IdempotencyInterceptor', () => {
  it('bypasses the transaction for handlers without the @Idempotent metadata', async () => {
    const reflector = makeReflector({ [IDEMPOTENT_METADATA_KEY]: false });
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const interceptor = new IdempotencyInterceptor(reflector, prisma);
    const { context } = makeContext(makeRequest());
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of('untouched')) };

    const result = await interceptor.intercept(context, next);

    expect(next.handle).toHaveBeenCalled();
    expect(prisma.runTopLevelTransaction).not.toHaveBeenCalled();
    await expect(firstValueFrom(result)).resolves.toBe('untouched');
  });

  it('bypasses the transaction when no Idempotency-Key header is present', async () => {
    const reflector = makeReflector({ [IDEMPOTENT_METADATA_KEY]: true });
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const interceptor = new IdempotencyInterceptor(reflector, prisma);
    const { context } = makeContext(makeRequest({ header: jest.fn().mockReturnValue(undefined) }));
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of('untouched')) };

    await interceptor.intercept(context, next);

    expect(prisma.runTopLevelTransaction).not.toHaveBeenCalled();
  });

  it('executes the handler and persists a COMPLETED record on first use of a key', async () => {
    const reflector = makeReflector({
      [IDEMPOTENT_METADATA_KEY]: true,
      [HTTP_CODE_METADATA]: 201,
    });
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const interceptor = new IdempotencyInterceptor(reflector, prisma);
    const { context, response } = makeContext(makeRequest());
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of({ id: 1 })) };

    const result = await interceptor.intercept(context, next);

    expect(tx.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ key: 'key-123', status: 'IN_PROGRESS' }),
      }),
    );
    expect(tx.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'key-123' },
        data: expect.objectContaining({ status: 'COMPLETED', responseStatus: 201 }),
      }),
    );
    expect(response.status).not.toHaveBeenCalled();
    await expect(firstValueFrom(result)).resolves.toEqual({ id: 1 });
  });

  it('replays the stored response for a completed key without re-running the handler', async () => {
    const reflector = makeReflector({
      [IDEMPOTENT_METADATA_KEY]: true,
      [HTTP_CODE_METADATA]: 201,
    });
    // Recompute the same canonical hash the interceptor would produce for this request body.
    const bodyHash = createHash('sha256')
      .update(JSON.stringify({ title: 'T' }))
      .digest('hex');
    const tx = makeTx({
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({
          bodyHash,
          status: 'COMPLETED',
          responseStatus: 201,
          responseBody: { id: 1, cached: true },
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const prisma = makePrisma(tx);
    const interceptor = new IdempotencyInterceptor(reflector, prisma);
    const { context } = makeContext(makeRequest());
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of({ id: 999 })) };

    const result = await interceptor.intercept(context, next);

    expect(next.handle).not.toHaveBeenCalled();
    expect(tx.idempotencyKey.create).not.toHaveBeenCalled();
    await expect(firstValueFrom(result)).resolves.toEqual({ id: 1, cached: true });
  });

  it('rejects with IDEMPOTENCY_KEY_REUSED when the same key is replayed with a different body', async () => {
    const reflector = makeReflector({ [IDEMPOTENT_METADATA_KEY]: true });
    const tx = makeTx({
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({
          bodyHash: 'a-different-hash',
          status: 'COMPLETED',
          responseStatus: 201,
          responseBody: {},
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const prisma = makePrisma(tx);
    const interceptor = new IdempotencyInterceptor(reflector, prisma);
    const { context } = makeContext(makeRequest());
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of('unused')) };

    await expect(interceptor.intercept(context, next)).rejects.toMatchObject({
      response: { error: { code: 'IDEMPOTENCY_KEY_REUSED' } },
    });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('stores the error response and rethrows it as an HttpException when the handler fails', async () => {
    const reflector = makeReflector({
      [IDEMPOTENT_METADATA_KEY]: true,
      [HTTP_CODE_METADATA]: 201,
    });
    const tx = makeTx();
    const prisma = makePrisma(tx);
    const interceptor = new IdempotencyInterceptor(reflector, prisma);
    const { context } = makeContext(makeRequest());
    const failure = new HttpException({ error: { code: 'TASK_NOT_FOUND', message: 'nope' } }, 404);
    const next: CallHandler = { handle: jest.fn().mockReturnValue(throwError(() => failure)) };

    await expect(interceptor.intercept(context, next)).rejects.toMatchObject({
      status: 404,
      response: { error: { code: 'TASK_NOT_FOUND', message: 'nope' } },
    });
    expect(tx.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', responseStatus: 404 }),
      }),
    );
  });
});
