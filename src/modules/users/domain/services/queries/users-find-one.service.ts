import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';

@Injectable()
export class UsersFindOneService {
  constructor(private readonly usersRepository: UsersRepositoryPort) {}

  // async findOnebyUsername(username: string): Promise<any> {
  //     const user = await this.usersRepository.find(username);
  //     return user;
  // }

  async findOnebyEmail(email: string): Promise<any> {
    return await this.usersRepository.findByEmail(email);
  }

  async findOnebyEmailNoValidate(email: string): Promise<any> {
    return await this.usersRepository.findByEmailNoValidate(email);
  }

  async findOnebyId(id: string): Promise<any> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }
}
