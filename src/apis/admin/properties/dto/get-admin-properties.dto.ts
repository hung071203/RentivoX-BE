import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { Trim } from '@lib/decorators';

export class GetAdminPropertiesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsUUID()
  landlordId?: string;

  @IsOptional()
  @IsIn(['name', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
