import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Validate,
} from 'class-validator';
import { Gender, UserRole } from '@lib/common/enums';
import { ToLowerCase, Trim } from '@lib/decorators';
import { MinAge18Constraint } from './validators';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  @ToLowerCase()
  email: string;

  @IsString()
  @Trim()
  fullName: string;

  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role: UserRole;

  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  @Validate(MinAge18Constraint)
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;
}
