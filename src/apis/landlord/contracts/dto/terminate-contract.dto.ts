import { Trim } from '@lib/decorators';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class TerminateContractDto {
  @IsDateString()
  terminatedDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Ghi chú không được vượt quá 5000 ký tự' })
  @Trim()
  terminatedReason?: string;
}
