import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '@entities/payment.entity';
import { Invoice } from '@entities/invoice.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Invoice])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
