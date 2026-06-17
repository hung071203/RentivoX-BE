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
}
