import { Injectable } from '@nestjs/common';
import { InitUseCase } from 'src/modules/commond/application/use-cases/init.use-case';
import { UsersCreateService } from 'src/modules/users/domain/services/commands/users-create.service';

@Injectable()
export class UsersCreateUseCase implements InitUseCase {
  constructor(private readonly UserCreateService: UsersCreateService) {}

  async init(args: any): Promise<any> {
    return await this.UserCreateService.create(args);
  }
}
