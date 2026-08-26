import { Injectable } from '@nestjs/common';
import { UserWithPendingTasks } from '../../entities/user.entity';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

@Injectable()
export class FindAllUsersService {
  constructor(private readonly usersRepository: UsersRepositoryPort) {}

  findAll(): Promise<UserWithPendingTasks[]> {
    return this.usersRepository.findAllWithPendingTasks();
  }
}
