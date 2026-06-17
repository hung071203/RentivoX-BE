import { IsEmail, IsString, Length } from 'class-validator';
import { Trim } from '@lib/decorators';

export class UpdateEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  newEmail: string;

  @IsString()
  @Length(6, 6, { message: 'Mã OTP gồm 6 chữ số' })
  otp: string;
}
