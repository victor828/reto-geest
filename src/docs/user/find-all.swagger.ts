import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export function ApiFindAllUsers() {
  return applyDecorators(
    ApiTags('Users'),
    ApiOperation({
      summary: 'Listar usuarios',
      description: 'Devuelve todos los usuarios registrados junto con sus tareas pendientes.',
    }),
    ApiOkResponse({
      description: 'Listado de usuarios',
      schema: {
        example: [
          {
            id: 1,
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan.perez@example.com',
            createdAt: '2026-08-25T10:00:00.000Z',
            pendingTasks: [{ id: 5, title: 'Preparar informe mensual' }],
          },
        ],
      },
    }),
  );
}
