import { Module } from '@nestjs/common';
import { ContractsModule } from '../apis/landlord/contracts/contracts.module';
import { WorkersModule } from '../workers/workers.module';
import { ContractAmendmentCron } from './contract-amendment.cron';
import { ContractExpiryCron } from './contract-expiry.cron';

@Module({
  imports: [ContractsModule, WorkersModule],
  providers: [ContractAmendmentCron, ContractExpiryCron],
})
export class CronsModule {}
