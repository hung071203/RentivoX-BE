import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullmqQueuesEnum } from '@lib/common/constants/bullmq.constant';
import { WorkersService } from './workers.service';
import { EmailProcessor } from './processors/email.processor';
import { MailsModule } from '../mails/mails.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: BullmqQueuesEnum.EMAIL }),
    MailsModule,
  ],
  providers: [WorkersService, EmailProcessor],
  exports: [BullModule, WorkersService],
})
export class WorkersModule {}
