import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../domain/interfaces/jwt-payload.interface';
import { UsersFindOneUseCase } from 'src/modules/users/application/use-cases/queries/users-find-one.use-case';
import { ConfigService } from '@nestjs/config';
import { UsersEntity } from 'src/modules/users/domain/entities/users.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logguer = new Logger(JwtStrategy.name);

  constructor(
    private readonly userFinfOne: UsersFindOneUseCase,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const user: UsersEntity = await this.userFinfOne.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!user.isActive) throw new UnauthorizedException('User is not active');
    return user;
  }
}
