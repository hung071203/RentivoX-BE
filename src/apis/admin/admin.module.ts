import { Module } from '@nestjs/common';
import { AdminUsersModule } from './users/users.module';
import { AdminDashboardModule } from './dashboard/dashboard.module';
import { AdminPropertiesModule } from './properties/properties.module';

@Module({
  imports: [AdminUsersModule, AdminDashboardModule, AdminPropertiesModule],
})
export class AdminModule {}
