import { Injectable } from '@nestjs/common';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { UserTaskSummary } from '../../entities/user.entity';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

@Injectable()
export class FindUserTasksService {
  constructor(private readonly usersRepository: UsersRepositoryPort) {}

  async findUserTasks(userId: number): Promise<UserTaskSummary[]> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new AppException(404, ErrorCode.USER_NOT_FOUND, `User ${userId} not found`);
    }
    return this.usersRepository.findUserTasks(userId);
  }
}
