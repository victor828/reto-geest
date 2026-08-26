import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiFindTaskById() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Obtener detalle de una tarea',
      description: 'Devuelve la información completa de una tarea, incluyendo sus asignados.',
    }),
    ApiParam({ name: 'idTask', type: Number, description: 'ID de la tarea', example: 10 }),
    ApiOkResponse({
      description: 'Detalle de la tarea',
      schema: {
        example: {
          id: 10,
          title: 'Preparar informe mensual',
          description: null,
          status: 'open',
          createdAt: '2026-08-25T10:00:00.000Z',
          archivedAt: null,
          assignees: [
            {
              userId: 1,
              name: 'Juan',
              lastName: 'Pérez',
              email: 'juan.perez@example.com',
              completed: false,
            },
          ],
        },
      },
    }),
    ApiErrorResponse(404, ErrorCode.TASK_NOT_FOUND, 'Task 10 not found'),
  );
}
