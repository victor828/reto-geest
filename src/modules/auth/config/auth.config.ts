import { ConfigService } from '@nestjs/config';

export class AuthConfig {
  static async configuration(configService: ConfigService) {
    return {
      secret: configService.getOrThrow<string>('JWS_SECRET'),
      signOptions: {
        expiresIn: configService.get('JWT_EXPIRES_IN'),
      },
    };
  }
}
