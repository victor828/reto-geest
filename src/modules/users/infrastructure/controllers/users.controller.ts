import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { UsersCreateUseCase } from '../../application/use-cases/commands/users-create.use-case';
import { UsersUpdateUseCase } from '../../application/use-cases/commands/users-update.use-case';
import { UsersDeleteUseCase } from '../../application/use-cases/commands/users-delete.use-case';
import { UsersFindAllUseCase } from '../../application/use-cases/queries/users-find-all.use-case';
import { UsersFindOneUseCase } from '../../application/use-cases/queries/users-find-one.use-case';
import { UsersUpdateRequestDto } from '../../application/dtos/users-update-request.dto';
import { UsersFindAllQueryDto } from '../../application/dtos/users-find-all-query.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'user', version: '1' })
export class UsersController {
  constructor(
    private readonly userCreateUseCase: UsersCreateUseCase,
    private readonly userUpdateUseCase: UsersUpdateUseCase,
    private readonly userDeleteUseCase: UsersDeleteUseCase,
    private readonly userFindAllService: UsersFindAllUseCase,
    private readonly userFindOneService: UsersFindOneUseCase,
  ) { }

  @Get('me')
  getMe(@Param('id', ParseUUIDPipe) id: string) {
    return this.userFindOneService.init(id);
  }

  @Get('all')
  getAllUsers(@Query() query: UsersFindAllQueryDto) {
    return this.userFindAllService.init(query);
  }

  @Get('profile/:id')
  getUserProfile(
    @Param('id', ParseUUIDPipe) id: string) {
    return this.userFindOneService.init(id);
  }

  @Post('update-profile/:id')
  updateUserProfile(
    @Param('id') id: string,
    @Body() data: UsersUpdateRequestDto) {
    return this.userUpdateUseCase.init(id, data);
  }

  @Delete('delete-account/:id')
  deleteUserAccount(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.userDeleteUseCase.init(id);
  }
}
