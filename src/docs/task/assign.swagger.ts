import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { AssignTaskDto } from 'src/modules/tasks/application/dtos/assign-task.dto';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiAssignTask() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Asignar usuarios a una tarea',
      description:
        'Asigna una o varias personas a una tarea existente. Acepta el header Idempotency-Key para deduplicar reintentos de la misma petición.',
    }),
    ApiParam({ name: 'idTask', type: Number, description: 'ID de la tarea', example: 10 }),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description: 'Clave única para deduplicar reintentos de esta petición POST.',
    }),
    ApiBody({ type: AssignTaskDto }),
    ApiOkResponse({
      description: 'Usuarios asignados exitosamente',
      schema: { example: { message: 'Users assigned to task successfully' } },
    }),
    ApiErrorResponse(400, ErrorCode.VALIDATION_ERROR, 'userIds should not be empty'),
    ApiErrorResponse(404, ErrorCode.TASK_NOT_FOUND, 'Task 10 not found'),
    ApiErrorResponse(404, ErrorCode.USER_NOT_FOUND, 'User(s) not found: 3, 4'),
    ApiErrorResponse(
      422,
      ErrorCode.IDEMPOTENCY_KEY_REUSED,
      'Idempotency-Key "abc-123" was already used with a different request body',
    ),
  );
}
