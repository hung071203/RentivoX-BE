import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { IsPhoneNumber } from 'class-validator';
import { Trim } from '@lib/decorators';
import { Gender } from '@lib/common/enums';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Họ tên tối thiểu 2 ký tự' })
  @Trim()
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
  @Trim()
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ (định dạng: YYYY-MM-DD)' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;
}
