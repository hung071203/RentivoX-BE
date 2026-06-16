import {
  BullmqEmailJobEnum,
  BullmqQueuesEnum,
} from '@lib/common/constants/bullmq.constant';
import { JobDataMap } from '@lib/common/interfaces/bullmq.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';

@Injectable()
export class WorkersService {
  constructor(@InjectQueue(BullmqQueuesEnum.EMAIL) private emailQueue: Queue) {}

  async sendEmailJob<T extends BullmqEmailJobEnum>(
    name: T,
    data: JobDataMap[T],
    opts?: JobsOptions,
  ) {
    return this.emailQueue.add(name, data, opts);
  }
}
