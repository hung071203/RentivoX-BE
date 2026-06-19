import { Job } from 'bullmq';
import { MailOptions } from './mail.interface';
import { BullmqContractJobEnum, BullmqEmailJobEnum } from '../constants/bullmq.constant';

export type EmailJobDataMap = {
  [BullmqEmailJobEnum.SEND_EMAIL]: MailOptions;
};

export type ContractJobDataMap = {
  [BullmqContractJobEnum.APPLY_AMENDMENT]: { amendmentId: string };
};

export type JobDataMap = EmailJobDataMap & ContractJobDataMap;

export type AllJobs = {
  [K in keyof JobDataMap]: Job<JobDataMap[K], void, K>;
}[keyof JobDataMap];

export type ContractAllJobs = {
  [K in keyof ContractJobDataMap]: Job<ContractJobDataMap[K], void, K>;
}[keyof ContractJobDataMap];
