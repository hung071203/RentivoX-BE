import { IsEmail, IsString } from 'class-validator';
import { Trim } from '@lib/decorators';

export class UpdateEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  email: string;

  @IsString({ message: 'Mật khẩu hiện tại là bắt buộc' })
  currentPassword: string;
}
