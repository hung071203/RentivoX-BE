import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesDto } from './dto/get-services.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/services')
export class LandlordServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@Query() dto: GetServicesDto, @CurrentUser() user: User) {
    return this.servicesService.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: User) {
    return this.servicesService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.servicesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.servicesService.remove(id, user);
  }
}
