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
import { IDEMPOTENT_METADATA_KEY, IdempotentOptions } from './idempotent.decorator';

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
 * Deduplica peticiones POST que llevan un header `Idempotency-Key`: la primera petición ejecuta
 * el handler dentro de una transacción de BD protegida por un advisory lock de Postgres asociado
 * al valor del header, persiste el resultado, y cualquier petición que compita con la misma clave
 * queda bloqueada en ese lock hasta poder reproducir la misma respuesta en lugar de re-ejecutar el handler.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const options = this.reflector.get<IdempotentOptions | undefined>(
      IDEMPOTENT_METADATA_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.header('Idempotency-Key');
    if (!providedKey && !options.autoKeyFromBody) return next.handle();

    const method = request.method;
    const path = request.originalUrl;
    const bodyHash = canonicalHash(request.body);
    // Sin header, y solo en endpoints marcados como naturalmente idempotentes por body
    // (autoKeyFromBody), derivamos una clave determinística del propio request (método + ruta +
    // body) para que reintentos idénticos sin Idempotency-Key también dedupliquen, sin chocar entre
    // requests distintos (p. ej. dos usuarios completando la misma tarea) porque el body ya forma
    // parte del hash.
    const key =
      providedKey ??
      `auto:${createHash('sha256').update(`${method}:${path}:${bodyHash}`).digest('hex')}`;
    const intendedStatus =
      this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler()) ??
      DEFAULT_SUCCESS_STATUS;

    const outcome = await this.prisma.runTopLevelTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key} || ${method} || ${path})::bigint)`;

      const existing = await tx.idempotencyKey.findUnique({
        where: { key_method_path: { key, method, path } },
      });

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
        // status === IN_PROGRESS aquí solo ocurre tras un crash a mitad de proceso (el advisory lock
        // se liberó junto con la conexión muerta); es seguro rehacer el trabajo y sobrescribir la fila.
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
        where: { key_method_path: { key, method, path } },
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
