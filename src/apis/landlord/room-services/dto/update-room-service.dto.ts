import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateRoomServiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice: number;
}
