import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { CreateUserDto } from '../../../application/dtos/create-user.dto';
import {
  UserEntity,
  UserTaskSummary,
  UserWithPendingTasks,
} from '../../../domain/entities/user.entity';
import { UsersRepositoryPort } from '../ports/users-repository.port';

@Injectable()
export class UsersRepositoryImpl implements UsersRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserEntity> {
    try {
      return await this.prisma.db.user.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException(
          409,
          ErrorCode.EMAIL_ALREADY_REGISTERED,
          `Email "${data.email}" is already registered`,
        );
      }
      throw err;
    }
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.prisma.db.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.db.user.findUnique({ where: { email } });
  }

  findManyByIds(ids: number[]): Promise<UserEntity[]> {
    return this.prisma.db.user.findMany({ where: { id: { in: ids } } });
  }

  async findAllWithPendingTasks(): Promise<UserWithPendingTasks[]> {
    const users = await this.prisma.db.user.findMany({
      orderBy: { id: 'asc' },
      include: {
        assignments: {
          where: { completedAt: null },
          include: { task: { select: { id: true, title: true } } },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt,
      pendingTasks: user.assignments.map((assignment) => ({
        id: assignment.task.id,
        title: assignment.task.title,
      })),
    }));
  }

  async findUserTasks(userId: number): Promise<UserTaskSummary[]> {
    const assignments = await this.prisma.db.taskAssignment.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      include: { task: true },
    });

    return assignments.map((assignment) => ({
      id: assignment.task.id,
      title: assignment.task.title,
      description: assignment.task.description,
      status: assignment.task.status,
      completed: assignment.completedAt !== null,
    }));
  }
}
