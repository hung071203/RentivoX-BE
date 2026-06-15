import {
  IsEmail,
  IsEnum,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { UserRole } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  email: string;

  @IsString()
  @Trim()
  fullName: string;

  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role: UserRole;

  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone: string;
}
