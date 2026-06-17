import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationDto } from '@lib/common/dto';
import { RoomStatus, RoomType } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class GetRoomsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;

  @IsOptional()
  @IsIn(['roomNumber', 'basePrice', 'areaM2', 'createdAt'], { message: 'orderBy không hợp lệ' })
  declare orderBy?: string;
}
