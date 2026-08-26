import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

export function ApiFindAllTasks() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Listar tareas',
      description: 'Devuelve todas las tareas junto con sus asignados. Permite filtrar por estado.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: ['open', 'archived'],
      description: 'Filtra las tareas por estado',
    }),
    ApiOkResponse({
      description: 'Listado de tareas',
      schema: {
        example: [
          {
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
        ],
      },
    }),
  );
}
