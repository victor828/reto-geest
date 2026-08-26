import { UsersUpdateRequestDto } from "src/modules/users/application/dtos/users-update-request.dto";
import { PaginatedResultDto } from "src/modules/commond/application/dtos/paginated-result.dto";
import { UsersFindAllQueryDto } from "src/modules/users/application/dtos/users-find-all-query.dto";
import { UsersEntity } from "src/modules/users/domain/entities/users.entity";

export abstract class UsersRepositoryPort {
  abstract create(user: any): Promise<any>;
  abstract findById(id: string): Promise<any>;
  // abstract findByUsername(username: string): Promise<any>;
  abstract findByEmail(email: string): Promise<any>;
  abstract findByEmailNoValidate(email: string): Promise<any>;
  abstract findAll(query: UsersFindAllQueryDto): Promise<PaginatedResultDto<UsersEntity>>;
  abstract update(id: string, data: any): Promise<any>;
  abstract delete(id: string): Promise<void>;
}
