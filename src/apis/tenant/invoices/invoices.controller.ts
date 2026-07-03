import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
import { InvoicesService } from './invoices.service';
import { GetTenantInvoicesDto } from './dto/get-invoices.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
@Controller('tenant/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() dto: GetTenantInvoicesDto, @CurrentUser() user: User) {
    return this.invoicesService.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invoicesService.findOne(id, user);
  }

  @Post(':id/payment-proof')
  @UseInterceptors(
    FileInterceptor('image', multerConfig('payment-proofs', 'image')),
  )
  submitPaymentProof(
    @Param('id') id: string,
    @Body() dto: SubmitPaymentProofDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('Ảnh chuyển khoản là bắt buộc');
    return this.invoicesService.submitPaymentProof(id, user, file, dto.note);
  }
}
