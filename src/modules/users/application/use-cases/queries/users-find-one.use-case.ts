import { Injectable } from '@nestjs/common';
import { InitUseCase } from 'src/modules/commond/application/use-cases/init.use-case';
import { UsersFindOneService } from 'src/modules/users/domain/services/queries/users-find-one.service';

@Injectable()
export class UsersFindOneUseCase implements InitUseCase {
  constructor(private readonly usersFindOneService: UsersFindOneService) {}

  async init(email: string) {
    return this.usersFindOneService.findOnebyEmail(email);
  }

  async findById(id: string) {
    return this.usersFindOneService.findOnebyId(id);
  }
}
