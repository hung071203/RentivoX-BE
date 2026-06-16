import { Job } from 'bullmq';
import { MailOptions } from './mail.interface';
import { BullmqEmailJobEnum } from '../constants/bullmq.constant';

export type EmailJobDataMap = {
  [BullmqEmailJobEnum.SEND_EMAIL]: MailOptions;
};

export type JobDataMap = EmailJobDataMap;

export type AllJobs = {
  [K in keyof JobDataMap]: Job<JobDataMap[K], void, K>;
}[keyof JobDataMap];
