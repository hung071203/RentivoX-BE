import { IsString } from 'class-validator';
import { ValidPass } from '@lib/decorators';

export class UpdatePasswordDto {
  @IsString({ message: 'Mật khẩu hiện tại là bắt buộc' })
  currentPassword: string;

  @ValidPass()
  newPassword: string;

  @IsString({ message: 'Xác nhận mật khẩu là bắt buộc' })
  confirmPassword: string;
}
