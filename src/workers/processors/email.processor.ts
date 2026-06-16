import { MailsService } from '../../mails/mails.service';
import { BaseProcessor } from '@lib/base/base.processor';
import {
  BullmqEmailJobEnum,
  BullmqQueuesEnum,
} from '@lib/common/constants/bullmq.constant';
import { AllJobs } from '@lib/common/interfaces/bullmq.interface';
import { MailOptions } from '@lib/common/interfaces/mail.interface';
import { Processor } from '@nestjs/bullmq';

@Processor(BullmqQueuesEnum.EMAIL)
export class EmailProcessor extends BaseProcessor {
  constructor(private readonly mailsService: MailsService) {
    super();
  }

  async process(job: AllJobs) {
    switch (job.name) {
      case BullmqEmailJobEnum.SEND_EMAIL: {
        await this.handleSendEmailJob(job.data);
        break;
      }

      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        break;
      }
    }
  }

  async handleSendEmailJob(data: MailOptions) {
    await this.mailsService.sendMail(data);
  }
}
