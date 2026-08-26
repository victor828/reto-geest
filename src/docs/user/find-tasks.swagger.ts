import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiFindUserTasks() {
  return applyDecorators(
    ApiTags('Users'),
    ApiOperation({
      summary: 'Listar tareas de un usuario',
      description: 'Devuelve las tareas asignadas a un usuario junto con su estado de completado.',
    }),
    ApiParam({ name: 'idUser', type: Number, description: 'ID del usuario', example: 1 }),
    ApiOkResponse({
      description: 'Tareas asignadas al usuario',
      schema: {
        example: [
          {
            id: 5,
            title: 'Preparar informe mensual',
            description: null,
            status: 'open',
            completed: false,
          },
        ],
      },
    }),
    ApiErrorResponse(404, ErrorCode.USER_NOT_FOUND, 'User 1 not found'),
  );
}
