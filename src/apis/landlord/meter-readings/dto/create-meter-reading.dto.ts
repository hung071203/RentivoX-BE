import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateMeterReadingDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString({}, { message: 'period phải là ngày hợp lệ (YYYY-MM-DD)' })
  period: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Chỉ số phải là số' })
  @Min(0, { message: 'Chỉ số không được âm' })
  valueStart: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Chỉ số phải là số' })
  @Min(0, { message: 'Chỉ số không được âm' })
  valueEnd: number;
}
