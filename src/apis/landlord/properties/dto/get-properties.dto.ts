import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { Trim } from '@lib/decorators';

export class GetPropertiesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsIn(['name', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
