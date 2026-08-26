import { CreateUserDto } from '../../../application/dtos/create-user.dto';
import {
  UserEntity,
  UserTaskSummary,
  UserWithPendingTasks,
} from '../../../domain/entities/user.entity';

export abstract class UsersRepositoryPort {
  abstract create(data: CreateUserDto): Promise<UserEntity>;
  abstract findById(id: number): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findManyByIds(ids: number[]): Promise<UserEntity[]>;
  abstract findAllWithPendingTasks(): Promise<UserWithPendingTasks[]>;
  abstract findUserTasks(userId: number): Promise<UserTaskSummary[]>;
}
