import { Injectable } from '@nestjs/common';
import { PostCommitHooks } from 'src/db/post-commit-hooks';
import { TaskDetail } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';
import { NotificationService } from '../../../infrastructure/notifications/notification.service';

@Injectable()
export class CompleteTaskService {
  constructor(
    private readonly tasksRepository: TasksRepositoryPort,
    private readonly notificationService: NotificationService,
  ) {}

  async complete(taskId: number, userId: number): Promise<{ message: string; task: TaskDetail }> {
    const { task, didArchive } = await this.tasksRepository.completeForUser(taskId, userId);

    if (didArchive) {
      // Deferred to run only once the archiving transaction has actually committed.
      await PostCommitHooks.register(() => this.notificationService.notifyArchived(task));
    }

    const detail = await this.tasksRepository.findDetailById(taskId);
    return { message: 'Task participation marked as completed', task: detail! };
  }
}
