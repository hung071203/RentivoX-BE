import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Gender } from '@lib/common/enums';
import { ToLowerCase, Trim } from '@lib/decorators';

export class CreateTenantDto {
  @IsString()
  @Trim()
  fullName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  @ToLowerCase()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone?: string;

  @IsString()
  @Trim()
  idCardNumber: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày cấp CCCD không hợp lệ' })
  idCardIssuedDate?: string;

  @IsOptional()
  @IsString()
  @Trim()
  idCardIssuedPlace?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Trim()
  permanentAddress?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  createAccount?: boolean;
}
