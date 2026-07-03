import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { multerConfig } from '@lib/configs/multer.config';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { GetVehiclesDto } from './dto/get-vehicles.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query() dto: GetVehiclesDto, @CurrentUser() landlord: User) {
    return this.vehiclesService.findAll(dto, landlord);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() landlord: User,
  ) {
    return this.vehiclesService.findOne(id, landlord);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig('vehicles', 'image')))
  create(
    @Body() dto: CreateVehicleDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() landlord: User,
  ) {
    if (!file) throw new BadRequestException('Ảnh phương tiện là bắt buộc');
    return this.vehiclesService.create(dto, file, landlord);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', multerConfig('vehicles', 'image')))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() landlord: User,
  ) {
    return this.vehiclesService.update(id, dto, landlord, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() landlord: User,
  ) {
    return this.vehiclesService.remove(id, landlord);
  }
}
