import { IsDateString, IsOptional, IsString } from 'class-validator';

export class TerminateContractDto {
  @IsDateString()
  terminatedDate: string;

  @IsOptional()
  @IsString()
  terminatedReason?: string;
}
