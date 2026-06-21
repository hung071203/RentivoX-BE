import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateMeterReadingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Chỉ số phải là số' })
  @Min(0, { message: 'Chỉ số không được âm' })
  valueStart?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Chỉ số phải là số' })
  @Min(0, { message: 'Chỉ số không được âm' })
  valueEnd?: number;
}
