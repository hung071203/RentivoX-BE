import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '@lib/decorators';

export class SubmitPaymentProofDto {
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(500)
  note?: string;
}
