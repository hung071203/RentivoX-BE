import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateRoomServiceDto {
  @IsUUID()
  serviceId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice: number;
}
