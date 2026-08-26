import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersFindOneUseCase } from 'src/modules/users/application/use-cases/queries/users-find-one.use-case';
import { LoginRequestDto } from '../../application/dtos/login-request.dto';
import { compare } from 'bcrypt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersFindOneUseCase,
    private jwtService: JwtService,
  ) {}

  async signIn(data: LoginRequestDto): Promise<{ access_token: string }> {
    const user = await this.usersService.init(data.email);
    const isMatch = await compare(data.password, user?.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException();
    }

    const payload: JwtPayload = { ...user };
    return {
      // 💡 Here the JWT secret key that's used for signing the payload
      // is the key that was passed in the JwtModule
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
