import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPhoneNumber } from 'class-validator';
import { MinAge16, Trim } from '@lib/decorators';
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
  @MinAge16()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;

  // Chỉ áp dụng khi role = landlord — dùng để tạo QR chuyển khoản (VietQR) trên hóa đơn
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(20)
  bankBin?: string;

  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(30)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(100)
  bankAccountHolder?: string;

  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(100)
  bankName?: string;
}
