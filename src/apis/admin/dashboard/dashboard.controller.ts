import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getStats() {
    return this.dashboardService.getStats();
  }
}
