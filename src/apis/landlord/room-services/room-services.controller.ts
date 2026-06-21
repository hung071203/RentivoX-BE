import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@lib/guards/jwt-auth.guard';
import { RolesGuard } from '@lib/guards/roles.guard';
import { Roles } from '@lib/decorators/roles.decorator';
import { CurrentUser } from '@lib/decorators/current-user.decorator';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { RoomServicesService } from './room-services.service';
import { CreateRoomServiceDto } from './dto/create-room-service.dto';
import { UpdateRoomServiceDto } from './dto/update-room-service.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/rooms/:roomId/services')
export class RoomServicesController {
  constructor(private readonly roomServicesService: RoomServicesService) {}

  @Get()
  findAll(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() landlord: User,
  ) {
    return this.roomServicesService.findByRoom(roomId, landlord);
  }

  @Post()
  create(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: CreateRoomServiceDto,
    @CurrentUser() landlord: User,
  ) {
    return this.roomServicesService.create(roomId, dto, landlord);
  }

  @Patch(':id')
  update(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomServiceDto,
    @CurrentUser() landlord: User,
  ) {
    return this.roomServicesService.update(roomId, id, dto, landlord);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() landlord: User,
  ) {
    return this.roomServicesService.remove(roomId, id, landlord);
  }
}
