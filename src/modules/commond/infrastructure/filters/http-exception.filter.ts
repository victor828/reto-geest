import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode } from '../../domain/exceptions/error-codes.enum';
import { ErrorEnvelope, isErrorEnvelope } from '../../domain/exceptions/app.exception';

const DEFAULT_CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_ERROR,
  404: ErrorCode.NOT_FOUND,
  429: ErrorCode.RATE_LIMITED,
};

const EXCEPTION_CLASS_PREFIX = /^[A-Za-z]*Exception:\s*/;

function extractMessage(response: unknown, fallback: string): string {
  if (typeof response === 'string') return response.replace(EXCEPTION_CLASS_PREFIX, '');
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = response.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message.replace(EXCEPTION_CLASS_PREFIX, '');
  }
  return fallback.replace(EXCEPTION_CLASS_PREFIX, '');
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorEnvelope = {
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Unexpected internal error' },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      body = isErrorEnvelope(exceptionResponse)
        ? exceptionResponse
        : {
            error: {
              code: DEFAULT_CODE_BY_STATUS[status] ?? ErrorCode.INTERNAL_ERROR,
              message: extractMessage(exceptionResponse, exception.message),
            },
          };
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json(body);
  }
}
