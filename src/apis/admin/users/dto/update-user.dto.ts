import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { Gender } from '@lib/common/enums';
import { MinAge16, ToLowerCase, Trim } from '@lib/decorators';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Trim()
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  @ToLowerCase()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isResetPassword?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  @MinAge16()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;
}
