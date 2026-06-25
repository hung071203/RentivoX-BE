import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { PaymentMethod } from '@lib/common/enums';

export class GetTenantPaymentsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsIn(['paymentDate', 'amount', 'createdAt'])
  declare orderBy?: string;
}
