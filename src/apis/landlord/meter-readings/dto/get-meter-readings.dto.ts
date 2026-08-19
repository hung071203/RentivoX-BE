import { IsDateString, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';

export class GetMeterReadingsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'period phải đúng định dạng YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'period phải đúng định dạng YYYY-MM-DD' },
  )
  period?: string;

  @IsOptional()
  @IsIn(['period', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
