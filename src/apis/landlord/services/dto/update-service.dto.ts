import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '@lib/decorators';
import { ServiceType } from '@lib/common/enums';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Trim()
  name?: string;

  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;

  @IsOptional()
  @IsString()
  @Trim()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
