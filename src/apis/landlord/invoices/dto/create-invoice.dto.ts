import { Trim } from '@lib/decorators';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  contractId: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'period phải có định dạng YYYY-MM',
  })
  period: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Ghi chú không được vượt quá 5000 ký tự' })
  @Trim()
  notes?: string;
}
