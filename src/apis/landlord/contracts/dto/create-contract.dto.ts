import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

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

export class OccupantInput {
  @IsUUID()
  tenantId: string;

  @IsBoolean()
  isOwner: boolean;

  @IsDateString()
  movedInDate: string;
}

export class CreateContractDto {
  @IsUUID()
  roomId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rentAmount: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositAmount: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value }) => plainToInstance(OccupantInput, parseJsonArray(value)))
  @IsArray()
  @ValidateNested({ each: true })
  occupants: OccupantInput[];
}
