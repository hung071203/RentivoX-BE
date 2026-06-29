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
import { memoryStorage } from 'multer';
import * as ExcelJS from 'exceljs';
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

  @Get('import/template')
  async downloadImportTemplate(@Res() res: Response) {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Chỉ số dịch vụ');

    ws.columns = [
      { header: 'Nhà trọ', key: 'property', width: 20 },
      { header: 'Phòng', key: 'room', width: 10 },
      { header: 'Dịch vụ', key: 'service', width: 20 },
      { header: 'Kỳ (YYYY-MM)', key: 'period', width: 15 },
      { header: 'Chỉ số đầu', key: 'valueStart', width: 15 },
      { header: 'Chỉ số cuối', key: 'valueEnd', width: 15 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    // Cột period: format text để Excel không auto-convert sang date
    ws.getColumn('period').numFmt = '@';

    // Dòng ví dụ
    ws.addRow({
      property: 'Nhà trọ A',
      room: '101',
      service: 'Điện',
      period: '2026-06',
      valueStart: 100,
      valueEnd: 150,
    });

    const buffer = await workbook.xlsx.writeBuffer().then((ab) => Buffer.from(ab));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="mau-chi-so-dich-vu.xlsx"',
    );
    res.end(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.meterReadingsService.importExcel(file.buffer, user.id);
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
