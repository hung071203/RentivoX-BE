import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { ServiceType } from '@lib/common/enums';

export class GetServicesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['name', 'unitPrice', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
