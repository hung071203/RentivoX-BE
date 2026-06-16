import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { UserRole } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Trim()
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isResetPassword?: boolean;
}
