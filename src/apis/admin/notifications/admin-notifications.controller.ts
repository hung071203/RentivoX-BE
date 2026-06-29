import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@lib/guards/jwt-auth.guard';
import { RolesGuard } from '@lib/guards/roles.guard';
import { Roles } from '@lib/decorators';
import { CurrentUser } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { NotificationsService } from '../../../notifications/notifications.service';
import { BroadcastNotificationDto } from '../../../notifications/dto/broadcast-notification.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  broadcast(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.createSystemAnnouncement(user.id, dto);
  }
}
