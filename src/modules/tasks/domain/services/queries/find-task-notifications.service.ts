import { Injectable } from '@nestjs/common';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { NotificationAttemptSummary } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class FindTaskNotificationsService {
  constructor(private readonly tasksRepository: TasksRepositoryPort) {}

  async findNotifications(taskId: number): Promise<NotificationAttemptSummary[]> {
    const task = await this.tasksRepository.findById(taskId);
    if (!task) {
      throw new AppException(404, ErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }
    return this.tasksRepository.findNotifications(taskId);
  }
}
