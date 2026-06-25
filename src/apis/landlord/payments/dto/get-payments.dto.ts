import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Trim } from '@lib/decorators';
import { PaginationDto } from '@lib/common/dto';
import { PaymentMethod, PaymentSource } from '@lib/common/enums';

export class GetPaymentsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Trim()
  referenceCode?: string;

  @IsOptional()
  @IsEnum(PaymentSource)
  source?: PaymentSource;

  @IsOptional()
  @IsIn(['paymentDate', 'amount', 'createdAt'])
  declare orderBy?: string;
}
