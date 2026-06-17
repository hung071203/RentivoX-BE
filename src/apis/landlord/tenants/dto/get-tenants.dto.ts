import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@lib/common/dto';

export class GetTenantsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasAccount?: boolean;

  @IsOptional()
  @IsIn(['fullName', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
