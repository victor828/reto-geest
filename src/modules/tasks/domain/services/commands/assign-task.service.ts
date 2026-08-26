import { Injectable } from '@nestjs/common';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class AssignTaskService {
  constructor(
    private readonly tasksRepository: TasksRepositoryPort,
    private readonly usersRepository: UsersRepositoryPort,
  ) {}

  async assign(taskId: number, userIds: number[]): Promise<{ message: string }> {
    const task = await this.tasksRepository.findById(taskId);
    if (!task) {
      throw new AppException(404, ErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    const existingUsers = await this.usersRepository.findManyByIds(userIds);
    const existingIds = new Set(existingUsers.map((user) => user.id));
    const missingIds = userIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new AppException(
        404,
        ErrorCode.USER_NOT_FOUND,
        `User(s) not found: ${missingIds.join(', ')}`,
      );
    }

    await this.tasksRepository.assignUsers(taskId, userIds);
    return { message: 'Users assigned to task successfully' };
  }
}
