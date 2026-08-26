import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class CompleteTaskDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  userId: number;
}
