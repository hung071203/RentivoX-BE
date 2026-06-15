import {
  IsBoolean,
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
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isResetPassword?: boolean;
}
