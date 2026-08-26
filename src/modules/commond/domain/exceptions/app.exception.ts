import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';

export interface ErrorEnvelope {
  error: { code: string; message: string };
}

export class AppException extends HttpException {
  constructor(status: number, code: ErrorCode, message: string) {
    super({ error: { code, message } } satisfies ErrorEnvelope, status);
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}
