import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { InvoiceStatus } from '@lib/common/enums';

export class GetInvoicesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsIn(Object.values(InvoiceStatus))
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  period?: string; // "YYYY-MM"

  @IsOptional()
  @IsIn(['period', 'createdAt', 'totalAmount', 'dueDate'])
  declare orderBy?: string;
}
