import { Injectable } from '@nestjs/common';
import { Pagination, PaginatedResult } from 'src/modules/commond/domain/entities/pagination.entity';
import { UserWithPendingTasks } from '../../entities/user.entity';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

@Injectable()
export class FindAllUsersService {
  constructor(private readonly usersRepository: UsersRepositoryPort) {}

  findAll(pagination: Pagination): Promise<PaginatedResult<UserWithPendingTasks>> {
    return this.usersRepository.findAllWithPendingTasks(pagination);
  }
}
