import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  contractId: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period phải có định dạng YYYY-MM' })
  period: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
