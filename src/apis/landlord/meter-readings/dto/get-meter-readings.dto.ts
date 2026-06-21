import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';

export class GetMeterReadingsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'period phải là ngày hợp lệ (YYYY-MM-DD)' })
  period?: string;

  @IsOptional()
  @IsIn(['period', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
