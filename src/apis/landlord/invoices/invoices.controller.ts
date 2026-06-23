import {
  Body,
  Controller,
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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() dto: GetInvoicesDto, @CurrentUser() user: User) {
    return this.invoicesService.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invoicesService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: User) {
    return this.invoicesService.createManual(dto, user);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invoicesService.cancel(id, user);
  }
}
