import { Injectable } from '@nestjs/common';
import { InitUseCase } from 'src/modules/commond/application/use-cases/init.use-case';
import { UsersCreateService } from 'src/modules/users/domain/services/commands/users-create.service';
import { RegisterRequestDto } from '../../dtos/register-request.dto';

@Injectable()
export class AuthCreateUseCase implements InitUseCase {
  constructor(private readonly usersCreateService: UsersCreateService) {}

  async init(data: RegisterRequestDto): Promise<void> {
    return await this.usersCreateService.create(data);
  }
}
