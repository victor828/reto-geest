import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

export function ApiFindAllTasks() {
  return applyDecorators(
    ApiTags('Tasks'),
    ApiOperation({
      summary: 'Listar tareas',
      description:
        'Devuelve las tareas (paginado) junto con sus asignados. Permite filtrar por estado.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: ['open', 'archived'],
      description: 'Filtra las tareas por estado',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Página a devolver (por defecto 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Elementos por página, máx. 100 (por defecto 20)',
    }),
    ApiOkResponse({
      description: 'Listado paginado de tareas',
      schema: {
        example: {
          data: [
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
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
    }),
  );
}
