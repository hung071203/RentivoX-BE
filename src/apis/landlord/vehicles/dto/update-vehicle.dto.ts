import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Trim } from '@lib/decorators';
import { VehicleType } from '@lib/common/enums';
import { normalizePlateNumber } from '@lib/common/constants/vehicle.constant';

export class UpdateVehicleDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePlateNumber(value) : value,
  )
  @MaxLength(20)
  plateNumber?: string;

  @IsOptional()
  @IsEnum(VehicleType, { message: 'Loại phương tiện không hợp lệ' })
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @Trim()
  notes?: string;
}
