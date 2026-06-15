import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';
import { RegexPatterns } from '@lib/common/constants/app.constant';

export const ValidPass = () =>
  applyDecorators(
    IsString(),
    MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' }),
    Matches(RegexPatterns.password, {
      message: 'Mật khẩu phải có chữ hoa, chữ thường và ký tự đặc biệt',
    }),
  );
