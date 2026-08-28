import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Idempotent } from 'src/modules/commond/infrastructure/idempotency/idempotent.decorator';
import { ApiAssignTask } from 'src/docs/task/assign.swagger';
import { ApiCompleteTask } from 'src/docs/task/complete.swagger';
import { ApiCreateTask } from 'src/docs/task/create.swagger';
import { ApiFindAllTasks } from 'src/docs/task/find-all.swagger';
import { ApiFindTaskNotifications } from 'src/docs/task/find-notifications.swagger';
import { ApiFindTaskById } from 'src/docs/task/find-one.swagger';
import { AssignTaskDto } from '../../application/dtos/assign-task.dto';
import { CompleteTaskDto } from '../../application/dtos/complete-task.dto';
import { CreateTaskDto } from '../../application/dtos/create-task.dto';
import { TasksQueryDto } from '../../application/dtos/tasks-query.dto';
import { AssignTaskService } from '../../domain/services/commands/assign-task.service';
import { CompleteTaskService } from '../../domain/services/commands/complete-task.service';
import { CreateTaskService } from '../../domain/services/commands/create-task.service';
import { FindAllTasksService } from '../../domain/services/queries/find-all-tasks.service';
import { FindTaskByIdService } from '../../domain/services/queries/find-task-by-id.service';
import { FindTaskNotificationsService } from '../../domain/services/queries/find-task-notifications.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTaskService: CreateTaskService,
    private readonly assignTaskService: AssignTaskService,
    private readonly completeTaskService: CompleteTaskService,
    private readonly findAllTasksService: FindAllTasksService,
    private readonly findTaskByIdService: FindTaskByIdService,
    private readonly findTaskNotificationsService: FindTaskNotificationsService,
  ) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  @ApiCreateTask()
  create(@Body() dto: CreateTaskDto) {
    return this.createTaskService.create(dto);
  }

  @Post(':idTask/assign')
  @HttpCode(200)
  @Idempotent()
  @ApiAssignTask()
  assign(@Param('idTask', ParseIntPipe) idTask: number, @Body() dto: AssignTaskDto) {
    return this.assignTaskService.assign(idTask, dto.userIds);
  }

  @Post(':idTask/complete')
  @HttpCode(200)
  @Idempotent()
  @ApiCompleteTask()
  complete(@Param('idTask', ParseIntPipe) idTask: number, @Body() dto: CompleteTaskDto) {
    return this.completeTaskService.complete(idTask, dto.userId);
  }

  @Get()
  @ApiFindAllTasks()
  findAll(@Query() query: TasksQueryDto) {
    return this.findAllTasksService.findAll(query.status, { page: query.page, limit: query.limit });
  }

  @Get(':idTask')
  @ApiFindTaskById()
  findOne(@Param('idTask', ParseIntPipe) idTask: number) {
    return this.findTaskByIdService.findById(idTask);
  }

  @Get(':idTask/notifications')
  @ApiFindTaskNotifications()
  findNotifications(@Param('idTask', ParseIntPipe) idTask: number) {
    return this.findTaskNotificationsService.findNotifications(idTask);
  }
}
