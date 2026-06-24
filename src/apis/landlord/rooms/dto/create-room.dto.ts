import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxOccupants: number;

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
  @MaxLength(5000, { message: 'Ghi chú không được vượt quá 5000 ký tự' })
  @Trim()
  notes?: string;
}
