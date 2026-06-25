import { Trim } from '@lib/decorators';
import { PaymentMethod } from '@lib/common/enums';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsInt()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Ghi chú không được vượt quá 5000 ký tự' })
  @Trim()
  notes?: string;
}
