import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterRequestDto } from 'src/modules/auth/application/dtos/register-request.dto';
import { UsersFindOneService } from '../queries/users-find-one.service';
import { hashSync } from 'bcrypt';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';
@Injectable()
export class UsersCreateService {
  constructor(
    private readonly userFindOneService: UsersFindOneService,
    private readonly usersRepository: UsersRepositoryPort,
  ) {}

  async create(data: RegisterRequestDto) {
    const user = await this.userFindOneService.findOnebyEmailNoValidate(data.email);
    if (user) throw new BadRequestException(`User with email ${data.email} already exists`);
    data.password = hashSync(data.password, 10);
    return await this.usersRepository.create(data);
  }
}
