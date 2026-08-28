import { Pagination, PaginatedResult } from 'src/modules/commond/domain/entities/pagination.entity';
import { CreateTaskDto } from '../../../application/dtos/create-task.dto';
import {
  NotificationAttemptSummary,
  TaskDetail,
  TaskEntity,
  TaskStatusValue,
} from '../../../domain/entities/task.entity';

export abstract class TasksRepositoryPort {
  abstract create(data: CreateTaskDto): Promise<TaskEntity>;
  abstract findById(id: number): Promise<TaskEntity | null>;
  abstract findDetailById(id: number): Promise<TaskDetail | null>;
  abstract findAll(
    status: TaskStatusValue | undefined,
    pagination: Pagination,
  ): Promise<PaginatedResult<TaskDetail>>;
  abstract assignUsers(
    taskId: number,
    userIds: number[],
  ): Promise<{ assigned: number[]; unassigned: number[] }>;
  /** Marks the user's part of the task as completed and, if it was the last pending one, archives the task — all inside a single serialized transaction. */
  abstract completeForUser(
    taskId: number,
    userId: number,
  ): Promise<{ task: TaskEntity; didArchive: boolean }>;
  abstract findNotifications(taskId: number): Promise<NotificationAttemptSummary[]>;
}
