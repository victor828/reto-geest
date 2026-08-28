import { Injectable } from '@nestjs/common';
import { Pagination, PaginatedResult } from 'src/modules/commond/domain/entities/pagination.entity';
import { TaskDetail, TaskStatusValue } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class FindAllTasksService {
  constructor(private readonly tasksRepository: TasksRepositoryPort) {}

  findAll(
    status: TaskStatusValue | undefined,
    pagination: Pagination,
  ): Promise<PaginatedResult<TaskDetail>> {
    return this.tasksRepository.findAll(status, pagination);
  }
}
