import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { AmendmentType } from '@lib/common/enums';

export class AmendmentServiceChangeInput {
  @IsOptional()
  @IsUUID()
  contractServiceId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  // Bắt buộc khi dùng contractServiceId (cập nhật giá dịch vụ đã có).
  // Khi dùng serviceId (thêm dịch vụ mới), có thể bỏ trống — hệ thống lấy
  // giá từ room_services của phòng; vẫn có thể truyền để override giá đó.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newUnitPrice?: number;
}

export class OccupantAddInput {
  @IsUUID()
  tenantId: string;

  @IsBoolean()
  isOwner: boolean;

  @IsDateString()
  movedInDate: string;
}

function parseJsonArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export class CreateAmendmentDto {
  @IsEnum(AmendmentType)
  amendmentType: AmendmentType;

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newRentAmount?: number;

  @IsOptional()
  @IsDateString()
  newEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Thay đổi giá dịch vụ — deferred đến effectiveDate, hoặc thêm dịch vụ mới (apply ngay)
  @IsOptional()
  @Transform(({ value }) => plainToInstance(AmendmentServiceChangeInput, parseJsonArray(value)))
  @IsArray()
  @ValidateNested({ each: true })
  serviceChanges?: AmendmentServiceChangeInput[];

  // Thêm người ở — apply ngay
  @IsOptional()
  @Transform(({ value }) => plainToInstance(OccupantAddInput, parseJsonArray(value)))
  @IsArray()
  @ValidateNested({ each: true })
  addOccupants?: OccupantAddInput[];

  @IsOptional()
  @Transform(({ value }) => parseJsonArray(value))
  @IsArray()
  @IsUUID('4', { each: true })
  removeOccupantIds?: string[];
}
