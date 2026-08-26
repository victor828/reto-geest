import { Injectable } from '@nestjs/common';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';
import { UsersFindAllQueryDto } from 'src/modules/users/application/dtos/users-find-all-query.dto';

@Injectable()
export class UsersFindAllService {
  constructor(
    private readonly userRepository: UsersRepositoryPort
  ) { }

  async findAll(query: UsersFindAllQueryDto) {
    return this.userRepository.findAll(query);
  }
}
