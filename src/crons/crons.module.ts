import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsModule } from '../apis/landlord/contracts/contracts.module';
import { WorkersModule } from '../workers/workers.module';
import { InvoicesModule } from '../apis/landlord/invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Invoice } from '@entities/invoice.entity';
import { Contract } from '@entities/contract.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { ContractAmendmentCron } from './contract-amendment.cron';
import { ContractExpiryCron } from './contract-expiry.cron';
import { InvoiceCron } from './invoice.cron';
import { InvoiceDueSoonCron } from './invoice-due-soon.cron';
import { ContractExpiringCron } from './contract-expiring.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Contract, RoomOccupant]),
    ContractsModule,
    WorkersModule,
    InvoicesModule,
    NotificationsModule,
  ],
  providers: [
    ContractAmendmentCron,
    ContractExpiryCron,
    InvoiceCron,
    InvoiceDueSoonCron,
    ContractExpiringCron,
  ],
})
export class CronsModule {}
