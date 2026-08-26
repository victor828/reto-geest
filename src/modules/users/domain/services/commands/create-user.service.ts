import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../../application/dtos/create-user.dto';
import { UserEntity } from '../../entities/user.entity';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

@Injectable()
export class CreateUserService {
  constructor(private readonly usersRepository: UsersRepositoryPort) {}

  create(data: CreateUserDto): Promise<UserEntity> {
    return this.usersRepository.create(data);
  }
}
