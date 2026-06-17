import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomType } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class CreateRoomDto {
  @IsUUID()
  propertyId: string;

  @IsString()
  @Trim()
  roomNumber: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsEnum(RoomType, { message: 'roomType phải là shared hoặc private' })
  roomType: RoomType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaM2?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxOccupants?: number;

  @IsOptional()
  @IsBoolean()
  hasPrivateWc?: boolean;

  @IsOptional()
  @IsBoolean()
  hasKitchen?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAc?: boolean;

  @IsOptional()
  @IsString()
  @Trim()
  notes?: string;
}
