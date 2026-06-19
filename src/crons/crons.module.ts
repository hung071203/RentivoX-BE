import { Module } from '@nestjs/common';
import { ContractsModule } from '../apis/landlord/contracts/contracts.module';
import { WorkersModule } from '../workers/workers.module';
import { ContractAmendmentCron } from './contract-amendment.cron';

@Module({
  imports: [ContractsModule, WorkersModule],
  providers: [ContractAmendmentCron],
})
export class CronsModule {}
