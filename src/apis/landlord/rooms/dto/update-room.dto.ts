import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { RoomStatus } from '@lib/common/enums';
import { CreateRoomDto } from './create-room.dto';

export class UpdateRoomDto extends PartialType(OmitType(CreateRoomDto, ['propertyId'] as const)) {
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: 'status phải là available, occupied, maintenance hoặc reserved',
  })
  status?: RoomStatus;
}
