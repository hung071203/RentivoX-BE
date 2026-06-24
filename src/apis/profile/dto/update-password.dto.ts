import { IsString } from 'class-validator';
import { Trim, ValidPass } from '@lib/decorators';

export class UpdatePasswordDto {
  @IsString({ message: 'Mật khẩu hiện tại là bắt buộc' })
  @Trim()
  currentPassword: string;

  @ValidPass()
  @Trim()
  newPassword: string;

  @IsString({ message: 'Xác nhận mật khẩu là bắt buộc' })
  @Trim()
  confirmPassword: string;
}
