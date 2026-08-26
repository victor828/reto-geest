import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { firstValueFrom, Observable, of } from 'rxjs';
import { PrismaService } from 'src/db/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AppException } from '../../domain/exceptions/app.exception';
import { ErrorCode } from '../../domain/exceptions/error-codes.enum';
import { IDEMPOTENT_METADATA_KEY } from './idempotent.decorator';

const DEFAULT_SUCCESS_STATUS = 201;

function canonicalHash(body: unknown): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = canonicalize((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return value;
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(body ?? {})))
    .digest('hex');
}

/**
 * Deduplicates POST requests carrying an `Idempotency-Key` header: the first request executes
 * the handler inside a DB transaction guarded by a Postgres advisory lock keyed on the header
 * value, persists the outcome, and any request racing with the same key blocks on that lock
 * until it can replay the exact same response instead of re-executing the handler.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT_METADATA_KEY, context.getHandler());
    if (!isIdempotent) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const key = request.header('Idempotency-Key');
    if (!key) return next.handle();

    const method = request.method;
    const path = request.originalUrl;
    const bodyHash = canonicalHash(request.body);
    const intendedStatus =
      this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler()) ??
      DEFAULT_SUCCESS_STATUS;

    const outcome = await this.prisma.runTopLevelTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;

      const existing = await tx.idempotencyKey.findUnique({ where: { key } });

      if (existing) {
        if (existing.bodyHash !== bodyHash) {
          throw new AppException(
            422,
            ErrorCode.IDEMPOTENCY_KEY_REUSED,
            `Idempotency-Key "${key}" was already used with a different request body`,
          );
        }
        if (existing.status === 'COMPLETED') {
          return { status: existing.responseStatus ?? intendedStatus, body: existing.responseBody };
        }
        // status === IN_PROGRESS here only happens after a crash mid-flight (the advisory lock
        // was released with the dead connection); safe to redo the work and overwrite the row.
      } else {
        await tx.idempotencyKey.create({
          data: { key, method, path, bodyHash, status: 'IN_PROGRESS' },
        });
      }

      let responseStatus = intendedStatus;
      let responseBody: unknown;

      try {
        responseBody = await firstValueFrom(next.handle());
      } catch (err) {
        if (!(err instanceof HttpException)) throw err;
        responseStatus = err.getStatus();
        responseBody = err.getResponse();
      }

      await tx.idempotencyKey.update({
        where: { key },
        data: {
          status: 'COMPLETED',
          responseStatus,
          responseBody: responseBody as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return { status: responseStatus, body: responseBody };
    });

    if (outcome.status >= 400) {
      throw new HttpException(outcome.body as Record<string, unknown>, outcome.status);
    }
    if (outcome.status !== intendedStatus) {
      context.switchToHttp().getResponse<Response>().status(outcome.status);
    }
    return of(outcome.body);
  }
}
