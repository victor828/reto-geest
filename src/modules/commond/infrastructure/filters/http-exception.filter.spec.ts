import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { AppException } from '../../domain/exceptions/app.exception';
import { ErrorCode } from '../../domain/exceptions/error-codes.enum';
import type { ArgumentsHost } from '@nestjs/common';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  it('passes through an AppException envelope unchanged', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = makeHost();
    const exception = new AppException(404, ErrorCode.TASK_NOT_FOUND, 'Task 1 not found');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: ErrorCode.TASK_NOT_FOUND, message: 'Task 1 not found' },
    });
  });

  it('maps a plain NestJS NotFoundException to the NOT_FOUND envelope', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = makeHost();

    filter.catch(new NotFoundException('missing'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: ErrorCode.NOT_FOUND, message: 'missing' },
    });
  });

  it('joins class-validator array messages from a BadRequestException', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = makeHost();

    filter.catch(
      new BadRequestException(['name must not be empty', 'email must be an email']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'name must not be empty, email must be an email',
      },
    });
  });

  it('falls back to a generic internal error envelope for unknown exceptions', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = makeHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Unexpected internal error' },
    });
  });
});
