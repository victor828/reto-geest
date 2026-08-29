import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { Pagination, PaginatedResult } from 'src/modules/commond/domain/entities/pagination.entity';
import {
  buildPaginatedResult,
  toSkipTake,
} from 'src/modules/commond/infrastructure/pagination/pagination.util';
import { CreateTaskDto } from '../../../application/dtos/create-task.dto';
import {
  NotificationAttemptSummary,
  TaskDetail,
  TaskEntity,
  TaskStatusValue,
} from '../../../domain/entities/task.entity';
import { TasksRepositoryPort } from '../ports/tasks-repository.port';

type TaskWithAssignments = Prisma.TaskGetPayload<{
  include: { assignments: { include: { user: true } } };
}>;

@Injectable()
export class TasksRepositoryImpl implements TasksRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTaskDto): Promise<TaskEntity> {
    return this.prisma.db.task.create({ data });
  }

  findById(id: number): Promise<TaskEntity | null> {
    return this.prisma.db.task.findUnique({ where: { id } });
  }

  async findDetailById(id: number): Promise<TaskDetail | null> {
    const task = await this.prisma.db.task.findUnique({
      where: { id },
      include: { assignments: { include: { user: true }, orderBy: { id: 'asc' } } },
    });
    return task ? this.mapDetail(task) : null;
  }

  async findAll(
    status: TaskStatusValue | undefined,
    pagination: Pagination,
  ): Promise<PaginatedResult<TaskDetail>> {
    const where = status ? { status } : undefined;
    const [tasks, total] = await Promise.all([
      this.prisma.db.task.findMany({
        where,
        orderBy: { id: 'asc' },
        ...toSkipTake(pagination),
        include: { assignments: { include: { user: true }, orderBy: { id: 'asc' } } },
      }),
      this.prisma.db.task.count({ where }),
    ]);
    return buildPaginatedResult(
      tasks.map((task) => this.mapDetail(task)),
      total,
      pagination,
    );
  }

  async assignUsers(
    taskId: number,
    userIds: number[],
  ): Promise<{ assigned: number[]; unassigned: number[] }> {
    return this.prisma.runInTransaction(async (tx) => {
      const existing = await tx.taskAssignment.findMany({
        where: { taskId, userId: { in: userIds } },
      });
      const existingByUserId = new Map(existing.map((assignment) => [assignment.userId, assignment]));

      const assigned: number[] = [];
      const unassigned: number[] = [];

      for (const userId of userIds) {
        const current = existingByUserId.get(userId);
        if (!current) {
          await tx.taskAssignment.create({ data: { taskId, userId } });
          assigned.push(userId);
        } else if (current.completedAt === null) {
          await tx.taskAssignment.delete({ where: { id: current.id } });
          unassigned.push(userId);
        }
      }

      return { assigned, unassigned };
    });
  }

  async completeForUser(
    taskId: number,
    userId: number,
  ): Promise<{ task: TaskEntity; didArchive: boolean }> {
    return this.prisma.runInTransaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new AppException(404, ErrorCode.TASK_NOT_FOUND, `Task ${taskId} not found`);
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppException(404, ErrorCode.USER_NOT_FOUND, `User ${userId} not found`);
      }

      const assignment = await tx.taskAssignment.findUnique({
        where: { taskId_userId: { taskId, userId } },
      });
      if (!assignment) {
        throw new AppException(
          400,
          ErrorCode.USER_NOT_ASSIGNED,
          `User ${userId} is not assigned to task ${taskId}`,
        );
      }

      // Serializa las finalizaciones concurrentes de esta tarea: la petición que llegue primero mantiene
      // el bloqueo de la fila hasta hacer commit, así una petición en carrera solo ve "pending = 0" una vez
      // que esa finalización ya es visible — ver docs/database-uml.md para el análisis completo de la carrera.
      await tx.$queryRaw`SELECT id FROM "Task" WHERE id = ${taskId} FOR UPDATE`;

      await tx.taskAssignment.updateMany({
        where: { taskId, userId, completedAt: null },
        data: { completedAt: new Date() },
      });

      const pending = await tx.taskAssignment.count({ where: { taskId, completedAt: null } });

      let resultTask = task;
      let didArchive = false;

      if (pending === 0) {
        const archived = await tx.task.updateMany({
          where: { id: taskId, status: 'open' },
          data: { status: 'archived', archivedAt: new Date() },
        });
        didArchive = archived.count === 1;
        resultTask = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
      }

      return { task: resultTask, didArchive };
    });
  }

  findNotifications(taskId: number): Promise<NotificationAttemptSummary[]> {
    return this.prisma.db.notificationAttempt.findMany({
      where: { taskId },
      orderBy: { attemptNumber: 'asc' },
      select: {
        attemptNumber: true,
        httpStatus: true,
        success: true,
        errorMessage: true,
        attemptedAt: true,
      },
    });
  }

  private mapDetail(task: TaskWithAssignments): TaskDetail {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt,
      archivedAt: task.archivedAt,
      assignees: task.assignments.map((assignment) => ({
        userId: assignment.user.id,
        name: assignment.user.name,
        lastName: assignment.user.lastName,
        email: assignment.user.email,
        completed: assignment.completedAt !== null,
      })),
    };
  }
}
