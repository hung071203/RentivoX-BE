import { IsEmail } from 'class-validator';
import { Trim } from '@lib/decorators';

export class SendOtpEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  newEmail: string;
}
