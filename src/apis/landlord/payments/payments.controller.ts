import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { GetPaymentsDto } from './dto/get-payments.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@Query() dto: GetPaymentsDto, @CurrentUser() user: User) {
    return this.paymentsService.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.paymentsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: User) {
    return this.paymentsService.create(dto, user);
  }
}
