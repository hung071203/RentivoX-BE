import { IsDateString, IsUUID } from 'class-validator';

export class AddOccupantDto {
  @IsUUID()
  tenantId: string;

  @IsDateString()
  movedInDate: string;
}
