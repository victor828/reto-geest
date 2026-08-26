import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsInt, IsPositive } from 'class-validator';

export class AssignTaskDto {
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  userIds: number[];
}
