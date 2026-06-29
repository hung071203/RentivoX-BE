import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../../notifications/notifications.module';
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminNotificationsController],
})
export class AdminNotificationsModule {}
