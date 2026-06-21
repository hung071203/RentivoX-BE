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
import { MeterReadingsService } from './meter-readings.service';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { UpdateMeterReadingDto } from './dto/update-meter-reading.dto';
import { GetMeterReadingsDto } from './dto/get-meter-readings.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/meter-readings')
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  @Get()
  findAll(@Query() dto: GetMeterReadingsDto, @CurrentUser() user: User) {
    return this.meterReadingsService.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.meterReadingsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateMeterReadingDto, @CurrentUser() user: User) {
    return this.meterReadingsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeterReadingDto,
    @CurrentUser() user: User,
  ) {
    return this.meterReadingsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.meterReadingsService.remove(id, user);
  }
}
