import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { AdminPropertiesService } from './properties.service';
import { GetAdminPropertiesDto } from './dto/get-admin-properties.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/properties')
export class AdminPropertiesController {
  constructor(private readonly propertiesService: AdminPropertiesService) {}

  @Get()
  findAll(@Query() dto: GetAdminPropertiesDto) {
    return this.propertiesService.findAll(dto);
  }
}
