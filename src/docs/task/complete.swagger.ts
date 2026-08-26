import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { CompleteTaskDto } from 'src/modules/tasks/application/dtos/complete-task.dto';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiCompleteTask() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Completar participación de un usuario en una tarea',
      description:
        'Marca como completada la asignación de un usuario en la tarea. Si todos los asignados ya completaron, la tarea se archiva automáticamente y se dispara una notificación. Acepta el header Idempotency-Key para deduplicar reintentos de la misma petición.',
    }),
    ApiParam({ name: 'idTask', type: Number, description: 'ID de la tarea', example: 10 }),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description: 'Clave única para deduplicar reintentos de esta petición POST.',
    }),
    ApiBody({ type: CompleteTaskDto }),
    ApiOkResponse({
      description: 'Participación marcada como completada',
      schema: {
        example: {
          message: 'Task participation marked as completed',
          task: {
            id: 10,
            title: 'Preparar informe mensual',
            description: null,
            status: 'archived',
            createdAt: '2026-08-25T10:00:00.000Z',
            archivedAt: '2026-08-25T12:00:00.000Z',
            assignees: [
              {
                userId: 1,
                name: 'Juan',
                lastName: 'Pérez',
                email: 'juan.perez@example.com',
                completed: true,
              },
            ],
          },
        },
      },
    }),
    ApiErrorResponse(404, ErrorCode.TASK_NOT_FOUND, 'Task 10 not found'),
    ApiErrorResponse(404, ErrorCode.USER_NOT_FOUND, 'User 1 not found'),
    ApiErrorResponse(400, ErrorCode.USER_NOT_ASSIGNED, 'User 1 is not assigned to task 10'),
    ApiErrorResponse(
      422,
      ErrorCode.IDEMPOTENCY_KEY_REUSED,
      'Idempotency-Key "abc-123" was already used with a different request body',
    ),
  );
}
