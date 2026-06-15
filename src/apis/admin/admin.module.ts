import { Module } from '@nestjs/common';
import { AdminUsersModule } from './users/users.module';
import { AdminDashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [AdminUsersModule, AdminDashboardModule],
})
export class AdminModule {}
