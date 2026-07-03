import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';

export class GetVehiclesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['plateNumber', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
