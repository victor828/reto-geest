import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

export function ApiFindAllUsers() {
  return applyDecorators(
    ApiTags('Users'),
    ApiOperation({
      summary: 'Listar usuarios',
      description: 'Devuelve los usuarios registrados (paginado) junto con sus tareas pendientes.',
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
      description: 'Listado paginado de usuarios',
      schema: {
        example: {
          data: [
            {
              id: 1,
              name: 'Juan',
              lastName: 'Pérez',
              email: 'juan.perez@example.com',
              createdAt: '2026-08-25T10:00:00.000Z',
              pendingTasks: [{ id: 5, title: 'Preparar informe mensual' }],
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
    }),
  );
}
