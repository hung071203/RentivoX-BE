import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '@entities/invoice.entity';
import { PaymentProof } from '@entities/payment-proof.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { UploadsModule } from '../../../uploads/uploads.module';
import { NotificationsModule } from '../../../notifications/notifications.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, PaymentProof, RoomOccupant, Tenant]),
    UploadsModule,
    NotificationsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class TenantInvoicesModule {}
