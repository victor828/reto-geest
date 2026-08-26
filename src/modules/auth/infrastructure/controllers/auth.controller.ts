import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../../domain/services/auth.service';
import { ErrorsUseCase } from 'src/modules/commond/application/use-cases/errors.use-case';
import { LoginRequestDto } from '../../application/dtos/login-request.dto';
import { AuthGuard } from '@nestjs/passport';
import { RegisterRequestDto } from '../../application/dtos/register-request.dto';
import { AuthCreateUseCase } from '../../application/use-cases/commands/auth-create.use-case';
import { LoginSwagger } from 'src/modules/docks/auth/loginSwagger';

@Controller()
// @Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCreateUser: AuthCreateUseCase,
  ) { }

  // @UseGuards(AuthGuard('local'))
  @LoginSwagger()
  @Post('login')
  signIn(@Body() signInDto: LoginRequestDto) {
    try {
      return this.authService.signIn(signInDto);
    } catch (error) {
      ErrorsUseCase.setError(error);
    }
  }

  @Post('users')
  register(@Body() registerDto: RegisterRequestDto) {
    return this.authCreateUser.init(registerDto);
  }

  @Post('logout')
  logout() {
    return { message: 'Logout endpoint' };
  }

  @UseGuards(AuthGuard())
  @Post('refresh-token')
  refreshToken() {
    return { message: 'Refresh token endpoint' };
  }

  @Post('reset-password')
  resetPassword() {
    return { message: 'Reset password endpoint' };
  }
}
