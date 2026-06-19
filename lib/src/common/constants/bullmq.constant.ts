import { DefaultJobOptions } from 'bullmq';

export const defaultBullmqJobOptions: DefaultJobOptions = {
  removeOnComplete: 100,
  removeOnFail: 1000,

  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
};

export enum BullmqQueuesEnum {
  NOTIFICATION = 'notification',
  EMAIL = 'email',
  CONTRACT = 'contract',
}

export enum BullmqNotificationJobEnum {
  SEND_NOTIFICATION = 'send_notification',
}

export enum BullmqEmailJobEnum {
  SEND_EMAIL = 'send_email',
}

export enum BullmqContractJobEnum {
  APPLY_AMENDMENT = 'apply_amendment',
}

export const BULLMQ_PREFIX = 'bullmq';
