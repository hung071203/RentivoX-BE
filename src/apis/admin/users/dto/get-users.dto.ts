import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { UserRole } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class GetUsersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string; // tìm theo fullName hoặc email

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role không hợp lệ' })
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
