import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { CreateUserDto } from 'src/modules/users/application/dtos/create-user.dto';
import { ApiErrorResponse } from '../common/api-error-response.decorator';

export function ApiCreateUser() {
  return applyDecorators(
    ApiTags('Users'),
    ApiOperation({
      summary: 'Crear usuario',
      description:
        'Registra un nuevo usuario. Acepta el header Idempotency-Key para deduplicar reintentos de la misma petición.',
    }),
    ApiHeader({
      name: 'Idempotency-Key',
      required: false,
      description: 'Clave única para deduplicar reintentos de esta petición POST.',
    }),
    ApiBody({
      type: CreateUserDto, examples: {
        createOne: {
          value: {
            name: "Example",
            email: "example@test.com"
          }
        }
      }
    }),
    ApiCreatedResponse({
      description: 'Usuario creado exitosamente',
      schema: {
        example: {
          id: 1,
          name: 'Juan',
          lastName: 'Pérez',
          email: 'juan.perez@example.com',
          createdAt: '2026-08-25T10:00:00.000Z',
        },
      },
    }),
    ApiErrorResponse(400, ErrorCode.VALIDATION_ERROR, 'name should not be empty, email must be an email'),
    ApiErrorResponse(
      409,
      ErrorCode.EMAIL_ALREADY_REGISTERED,
      'Email "juan.perez@example.com" is already registered',
    ),
    ApiErrorResponse(
      422,
      ErrorCode.IDEMPOTENCY_KEY_REUSED,
      'Idempotency-Key "abc-123" was already used with a different request body',
    ),
  );
}
