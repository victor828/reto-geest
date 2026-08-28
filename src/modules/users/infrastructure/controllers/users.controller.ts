import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Idempotent } from 'src/modules/commond/infrastructure/idempotency/idempotent.decorator';
import { PaginationQueryDto } from 'src/modules/commond/application/dtos/pagination-query.dto';
import { ApiCreateUser } from 'src/docs/user/create.swagger';
import { ApiFindAllUsers } from 'src/docs/user/find-all.swagger';
import { ApiFindUserTasks } from 'src/docs/user/find-tasks.swagger';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { CreateUserService } from '../../domain/services/commands/create-user.service';
import { FindAllUsersService } from '../../domain/services/queries/find-all-users.service';
import { FindUserTasksService } from '../../domain/services/queries/find-user-tasks.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserService: CreateUserService,
    private readonly findAllUsersService: FindAllUsersService,
    private readonly findUserTasksService: FindUserTasksService,
  ) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  @ApiCreateUser()
  create(@Body() dto: CreateUserDto) {
    return this.createUserService.create(dto);
  }

  @Get()
  @ApiFindAllUsers()
  findAll(@Query() query: PaginationQueryDto) {
    return this.findAllUsersService.findAll({ page: query.page, limit: query.limit });
  }

  @Get(':idUser/tasks')
  @ApiFindUserTasks()
  findUserTasks(@Param('idUser', ParseIntPipe) idUser: number) {
    return this.findUserTasksService.findUserTasks(idUser);
  }
}
