import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '@entities/payment.entity';
import { Tenant } from '@entities/tenant.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Tenant])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class TenantPaymentsModule {}
