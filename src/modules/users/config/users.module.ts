import { Module } from '@nestjs/common';
import { UsersController } from '../infrastructure/controllers/users.controller';
import { UsersFindOneService } from '../domain/services/queries/users-find-one.service';
import { UsersCreateUseCase } from '../application/use-cases/commands/users-create.use-case';
import { UsersDeleteUseCase } from '../application/use-cases/commands/users-delete.use-case';
import { UsersUpdateUseCase } from '../application/use-cases/commands/users-update.use-case';
import { UsersFindAllUseCase } from '../application/use-cases/queries/users-find-all.use-case';
import { UsersFindOneUseCase } from '../application/use-cases/queries/users-find-one.use-case';
import { UsersFindAllService } from '../domain/services/queries/users-find-all.service';
import { UsersCreateService } from '../domain/services/commands/users-create.service';
import { UsersRepositoryPort } from '../infrastructure/adapters/ports/users-repository.port';
import { UsersRepositoryImpl } from '../infrastructure/adapters/implements/users-repository.impl';
import { UsersUpdateService } from '../domain/services/commands/users-update.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [
    // Services
    UsersFindOneService,
    UsersFindAllService,
    UsersCreateService,
    UsersUpdateService,

    // Use Cases
    UsersCreateUseCase,
    UsersUpdateUseCase,
    UsersDeleteUseCase,
    UsersFindAllUseCase,
    UsersFindOneUseCase,

    {
      provide: UsersRepositoryPort,
      useClass: UsersRepositoryImpl,
    },
  ],
  exports: [UsersFindOneUseCase, UsersCreateUseCase, UsersCreateService],
})
export class UsersModule { }
