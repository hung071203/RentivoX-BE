import {
  BullmqContractJobEnum,
  BullmqEmailJobEnum,
  BullmqQueuesEnum,
} from '@lib/common/constants/bullmq.constant';
import { ContractJobDataMap, EmailJobDataMap } from '@lib/common/interfaces/bullmq.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';

@Injectable()
export class WorkersService {
  constructor(
    @InjectQueue(BullmqQueuesEnum.EMAIL) private emailQueue: Queue,
    @InjectQueue(BullmqQueuesEnum.CONTRACT) private contractQueue: Queue,
  ) {}

  async sendEmailJob<T extends BullmqEmailJobEnum>(
    name: T,
    data: EmailJobDataMap[T],
    opts?: JobsOptions,
  ) {
    return this.emailQueue.add(name, data, opts);
  }

  async sendContractJob<T extends BullmqContractJobEnum>(
    name: T,
    data: ContractJobDataMap[T],
    opts?: JobsOptions,
  ) {
    return this.contractQueue.add(name, data, opts);
  }
}
