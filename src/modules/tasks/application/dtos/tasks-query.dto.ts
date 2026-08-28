import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/modules/commond/application/dtos/pagination-query.dto';

export class TasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['open', 'archived'])
  status?: 'open' | 'archived';
}
