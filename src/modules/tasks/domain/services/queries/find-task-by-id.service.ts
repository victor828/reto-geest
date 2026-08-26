import { Injectable } from '@nestjs/common';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { TaskDetail } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class FindTaskByIdService {
  constructor(private readonly tasksRepository: TasksRepositoryPort) {}

  async findById(taskId: number): Promise<TaskDetail> {
    const task = await this.tasksRepository.findDetailById(taskId);
    if (!task) {
      throw new AppException(404, ErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }
    return task;
  }
}
