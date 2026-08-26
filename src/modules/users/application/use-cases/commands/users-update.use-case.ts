import { Injectable } from '@nestjs/common';
import { InitUseCase } from 'src/modules/commond/application/use-cases/init.use-case';
import { UsersUpdateRequestDto } from '../../dtos/users-update-request.dto';
import { UsersUpdateService } from 'src/modules/users/domain/services/commands/users-update.service';
import { IUserUpdateOptional } from 'src/modules/users/domain/interfaces/users-update.interface';

@Injectable()
export class UsersUpdateUseCase implements InitUseCase {

  constructor(
    private readonly userUpdate: UsersUpdateService
  ) { }

  async init(id: string, data: UsersUpdateRequestDto) {
    return await this.userUpdate.updateUser(id, this.responseTransformer(data))
  }

  responseTransformer(data: UsersUpdateRequestDto): IUserUpdateOptional {
    return {
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
    }

  }
}
