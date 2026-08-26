import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiFindTaskNotifications() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Listar intentos de notificación de una tarea',
      description:
        'Devuelve el historial de intentos de notificación (webhooks) enviados cuando la tarea fue archivada.',
    }),
    ApiParam({ name: 'idTask', type: Number, description: 'ID de la tarea', example: 10 }),
    ApiOkResponse({
      description: 'Historial de intentos de notificación',
      schema: {
        example: [
          {
            attemptNumber: 1,
            httpStatus: 200,
            success: true,
            errorMessage: null,
            attemptedAt: '2026-08-25T12:00:05.000Z',
          },
        ],
      },
    }),
    ApiErrorResponse(404, ErrorCode.TASK_NOT_FOUND, 'Task 10 not found'),
  );
}
