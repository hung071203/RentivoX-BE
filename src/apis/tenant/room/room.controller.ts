import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { RoomService } from './room.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
@Controller('tenant/room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findCurrentRoom(@CurrentUser() user: User) {
    return this.roomService.findCurrentRoom(user);
  }
}
