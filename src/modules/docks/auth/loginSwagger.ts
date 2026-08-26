import { applyDecorators } from "@nestjs/common";
import { ApiBody, ApiOperation } from "@nestjs/swagger";
import { LoginRequestDto } from "src/modules/auth/application/dtos/login-request.dto";

export function LoginSwagger() {
    return applyDecorators(
        ApiOperation({ description: 'A' }),
        ApiBody({
            description: 'Login EP, return Token, is necesary to use the API',
            type: LoginRequestDto,
            schema: {
                type: 'object',
                properties: {
                    email: {
                        type: 'string',
                    },
                    password: {
                        type: 'String'
                    }
                },

            },
            examples: {
                'login': {
                    value: {
                        email: 'ppe@mail.com',
                        password: '123465@aA'
                    }
                }
            }
        })

    )

}