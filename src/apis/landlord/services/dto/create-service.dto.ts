import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Trim } from '@lib/decorators';
import { ServiceType } from '@lib/common/enums';

export class CreateServiceDto {
  @IsUUID()
  propertyId: string;

  @IsString()
  @Trim()
  name: string;

  @IsEnum(ServiceType)
  type: ServiceType;

  @IsOptional()
  @IsString()
  @Trim()
  unit?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;
}
