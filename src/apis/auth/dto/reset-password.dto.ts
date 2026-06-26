import { ToLowerCase, Trim } from '@lib/decorators';
import { ValidPass } from '@lib/decorators';
import { IsEmail, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  @ToLowerCase()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Mã OTP gồm 6 chữ số' })
  otp: string;

  @ValidPass()
  newPassword: string;

  @IsString({ message: 'Xác nhận mật khẩu là bắt buộc' })
  confirmPassword: string;
}
