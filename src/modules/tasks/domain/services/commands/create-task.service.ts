import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from '../../../application/dtos/create-task.dto';
import { TaskEntity } from '../../entities/task.entity';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

@Injectable()
export class CreateTaskService {
  constructor(private readonly tasksRepository: TasksRepositoryPort) {}

  create(data: CreateTaskDto): Promise<TaskEntity> {
    return this.tasksRepository.create(data);
  }
}
