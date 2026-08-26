import { ApiResponse } from '@nestjs/swagger';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';

/** Documents an error response shaped like the app's ErrorEnvelope: `{ error: { code, message } }`. */
export function ApiErrorResponse(status: number, code: ErrorCode, example: string, description?: string) {
  return ApiResponse({
    status,
    description: description ?? example,
    schema: {
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: code },
            message: { type: 'string', example },
          },
        },
      },
    },
  });
}
