import { Injectable } from '@nestjs/common';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';
import { CreateTaskDto } from '../../../application/dtos/create-task.dto';
import { TaskEntity } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class CreateTaskService {
  constructor(
    private readonly tasksRepository: TasksRepositoryPort,
    private readonly usersRepository: UsersRepositoryPort,
  ) {}

  async create(data: CreateTaskDto): Promise<TaskEntity> {
    const { userIds, ...taskData } = data;

    if (userIds?.length) {
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
    }

    const task = await this.tasksRepository.create(taskData);

    if (userIds?.length) {
      await this.tasksRepository.assignUsers(task.id, userIds);
    }

    return task;
  }
}
