import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullmqQueuesEnum } from '@lib/common/constants/bullmq.constant';
import { WorkersService } from './workers.service';
import { EmailProcessor } from './processors/email.processor';
import { ContractAmendmentProcessor } from './processors/contract-amendment.processor';
import { MailsModule } from '../mails/mails.module';
import { ContractsModule } from '../apis/landlord/contracts/contracts.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: BullmqQueuesEnum.EMAIL }),
    BullModule.registerQueue({ name: BullmqQueuesEnum.CONTRACT }),
    MailsModule,
    ContractsModule,
  ],
  providers: [WorkersService, EmailProcessor, ContractAmendmentProcessor],
  exports: [BullModule, WorkersService],
})
export class WorkersModule {}
