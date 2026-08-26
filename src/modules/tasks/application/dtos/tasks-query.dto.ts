import { IsIn, IsOptional } from 'class-validator';

export class TasksQueryDto {
  @IsOptional()
  @IsIn(['open', 'archived'])
  status?: 'open' | 'archived';
}
