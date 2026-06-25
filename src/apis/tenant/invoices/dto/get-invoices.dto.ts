import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { InvoiceStatus } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class GetTenantInvoicesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  @Trim()
  period?: string; // "YYYY-MM"

  @IsOptional()
  @IsIn(['period', 'createdAt', 'totalAmount', 'dueDate'])
  declare orderBy?: string;
}
