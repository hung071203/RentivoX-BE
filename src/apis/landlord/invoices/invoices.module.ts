import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '@entities/invoice.entity';
import { InvoiceItem } from '@entities/invoice-item.entity';
import { PaymentProof } from '@entities/payment-proof.entity';
import { Contract } from '@entities/contract.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { MeterReading } from '@entities/meter-reading.entity';
import { WorkersModule } from '../../../workers/workers.module';
import { NotificationsModule } from '../../../notifications/notifications.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      PaymentProof,
      Contract,
      ContractServiceEntity,
      MeterReading,
    ]),
    WorkersModule,
    NotificationsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
