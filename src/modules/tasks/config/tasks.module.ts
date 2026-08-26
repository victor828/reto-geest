import { Module } from '@nestjs/common';
import { UsersModule } from 'src/modules/users/config/users.module';
import { AssignTaskService } from '../domain/services/commands/assign-task.service';
import { CompleteTaskService } from '../domain/services/commands/complete-task.service';
import { CreateTaskService } from '../domain/services/commands/create-task.service';
import { FindAllTasksService } from '../domain/services/queries/find-all-tasks.service';
import { FindTaskByIdService } from '../domain/services/queries/find-task-by-id.service';
import { FindTaskNotificationsService } from '../domain/services/queries/find-task-notifications.service';
import { TasksRepositoryPort } from '../infrastructure/adapters/ports/tasks-repository.port';
import { TasksRepositoryImpl } from '../infrastructure/adapters/implements/tasks-repository.impl';
import { NotificationService } from '../infrastructure/notifications/notification.service';
import { TasksController } from '../infrastructure/controllers/tasks.controller';

@Module({
  imports: [UsersModule],
  controllers: [TasksController],
  providers: [
    CreateTaskService,
    AssignTaskService,
    CompleteTaskService,
    FindAllTasksService,
    FindTaskByIdService,
    FindTaskNotificationsService,
    NotificationService,
    { provide: TasksRepositoryPort, useClass: TasksRepositoryImpl },
  ],
})
export class TasksModule {}
