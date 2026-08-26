import { Module } from '@nestjs/common';
import { CreateUserService } from '../domain/services/commands/create-user.service';
import { FindAllUsersService } from '../domain/services/queries/find-all-users.service';
import { FindUserTasksService } from '../domain/services/queries/find-user-tasks.service';
import { UsersRepositoryPort } from '../infrastructure/adapters/ports/users-repository.port';
import { UsersRepositoryImpl } from '../infrastructure/adapters/implements/users-repository.impl';
import { UsersController } from '../infrastructure/controllers/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    CreateUserService,
    FindAllUsersService,
    FindUserTasksService,
    { provide: UsersRepositoryPort, useClass: UsersRepositoryImpl },
  ],
  exports: [UsersRepositoryPort],
})
export class UsersModule {}
