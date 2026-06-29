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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { multerConfig } from '@lib/configs/multer.config';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GetTenantsDto } from './dto/get-tenants.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll(@Query() dto: GetTenantsDto, @CurrentUser() user: User) {
    return this.tenantsService.findAll(dto, user);
  }

  @Get('export')
  async exportExcel(
    @Query() dto: GetTenantsDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const buffer = await this.tenantsService.exportExcel(dto, user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="khach-thue.xlsx"',
    );
    res.end(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tenantsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: User) {
    return this.tenantsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tenantsService.remove(id, user);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tenantsService.toggleActive(id, user);
  }

  @Post(':id/id-card/front')
  @UseInterceptors(FileInterceptor('file', multerConfig('id-cards', 'image')))
  uploadIdCardFront(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.uploadIdCard(id, file, 'front', user);
  }

  @Post(':id/id-card/back')
  @UseInterceptors(FileInterceptor('file', multerConfig('id-cards', 'image')))
  uploadIdCardBack(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.tenantsService.uploadIdCard(id, file, 'back', user);
  }
}
