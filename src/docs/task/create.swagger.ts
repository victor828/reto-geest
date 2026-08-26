import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { CreateTaskDto } from 'src/modules/tasks/application/dtos/create-task.dto';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiCreateTask() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Crear tarea',
      description:
        'Crea una nueva tarea en estado "open". Acepta el header Idempotency-Key para deduplicar reintentos de la misma petición.',
    }),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description: 'Clave única para deduplicar reintentos de esta petición POST.',
    }),
    ApiBody({ type: CreateTaskDto }),
    ApiCreatedResponse({
      description: 'Tarea creada exitosamente',
      schema: {
        example: {
          id: 10,
          title: 'Preparar informe mensual',
          description: null,
          status: 'open',
          createdAt: '2026-08-25T10:00:00.000Z',
          archivedAt: null,
        },
      },
    }),
    ApiErrorResponse(400, ErrorCode.VALIDATION_ERROR, 'title should not be empty'),
    ApiErrorResponse(
      422,
      ErrorCode.IDEMPOTENCY_KEY_REUSED,
      'Idempotency-Key "abc-123" was already used with a different request body',
    ),
  );
}
