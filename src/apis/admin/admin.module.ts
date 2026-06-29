import { Module } from '@nestjs/common';
import { AdminUsersModule } from './users/users.module';
import { AdminDashboardModule } from './dashboard/dashboard.module';
import { AdminPropertiesModule } from './properties/properties.module';
import { AdminNotificationsModule } from './notifications/admin-notifications.module';

@Module({
  imports: [AdminUsersModule, AdminDashboardModule, AdminPropertiesModule, AdminNotificationsModule],
})
export class AdminModule {}
