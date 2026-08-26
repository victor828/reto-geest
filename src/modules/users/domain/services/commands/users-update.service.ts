import { Injectable } from '@nestjs/common';
import { UsersUpdateRequestDto } from 'src/modules/users/application/dtos/users-update-request.dto';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';

@Injectable()
export class UsersUpdateService {
    constructor(
        private readonly userRepository: UsersRepositoryPort
    ) { }

    async updateUser(id: string, data: any) {
        return this.userRepository.update(id, data)
    }
}
