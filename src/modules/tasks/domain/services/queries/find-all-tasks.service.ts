import { Injectable } from '@nestjs/common';
import { TaskDetail, TaskStatusValue } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class FindAllTasksService {
  constructor(private readonly tasksRepository: TasksRepositoryPort) {}

  findAll(status?: TaskStatusValue): Promise<TaskDetail[]> {
    return this.tasksRepository.findAll(status);
  }
}
