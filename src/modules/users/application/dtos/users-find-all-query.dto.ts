import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/modules/commond/application/dtos/pagination-query.dto';

export const USERS_SORTABLE_FIELDS = [
  'email',
  'fullName',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const;

export type UsersSortableField = (typeof USERS_SORTABLE_FIELDS)[number];

export class UsersFindAllQueryDto extends PaginationQueryDto {
  @IsIn(USERS_SORTABLE_FIELDS)
  @IsOptional()
  sortBy?: UsersSortableField = 'createdAt';
}
