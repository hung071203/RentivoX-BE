import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsUUID, Matches, Min } from 'class-validator';

export class CreateMeterReadingDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  serviceId: string;

  // IsDateString({strict:true}) vẫn chấp nhận "YYYY-MM" (ISO8601 hợp lệ theo
  // dạng năm-tháng) — phải ép thêm định dạng đủ ngày bằng regex, vì cột DB là
  // DATE strict, thiếu ngày sẽ crash 500 ở tầng DB thay vì validate được ở đây
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'period phải đúng định dạng YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'period phải đúng định dạng YYYY-MM-DD' },
  )
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
