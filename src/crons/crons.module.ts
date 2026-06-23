import { Module } from '@nestjs/common';
import { ContractsModule } from '../apis/landlord/contracts/contracts.module';
import { WorkersModule } from '../workers/workers.module';
import { InvoicesModule } from '../apis/landlord/invoices/invoices.module';
import { ContractAmendmentCron } from './contract-amendment.cron';
import { ContractExpiryCron } from './contract-expiry.cron';
import { InvoiceCron } from './invoice.cron';

@Module({
  imports: [ContractsModule, WorkersModule, InvoicesModule],
  providers: [ContractAmendmentCron, ContractExpiryCron, InvoiceCron],
})
export class CronsModule {}
