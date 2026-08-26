import { Injectable } from '@nestjs/common';
import { InitUseCase } from 'src/modules/commond/application/use-cases/init.use-case';
import { UsersFindAllService } from 'src/modules/users/domain/services/queries/users-find-all.service';
import { UsersFindAllQueryDto } from '../../dtos/users-find-all-query.dto';

@Injectable()
export class UsersFindAllUseCase implements InitUseCase {
  constructor(
    private readonly userFindAll: UsersFindAllService
  ) { }

  async init(query: UsersFindAllQueryDto) {
    return this.userFindAll.findAll(query);
  }
}
