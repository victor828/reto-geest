import { Module } from '@nestjs/common';
import { AuthController } from '../infrastructure/controllers/auth.controller';
import { UsersModule } from 'src/modules/users/config/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../domain/services/auth.service';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthCreateUseCase } from '../application/use-cases/commands/auth-create.use-case';
import { JwtStrategy } from '../infrastructure/strategy/jwt.strategy';
import { AuthConfig } from './auth.config';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      useFactory: AuthConfig.configuration,
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthCreateUseCase],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
