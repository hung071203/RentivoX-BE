import { ToLowerCase, Trim } from '@lib/decorators';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Trim()
  @ToLowerCase()
  email: string;

  @IsString()
  @Trim()
  password: string;
}
