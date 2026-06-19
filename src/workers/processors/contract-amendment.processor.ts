import { BaseProcessor } from '@lib/base/base.processor';
import {
  BullmqContractJobEnum,
  BullmqQueuesEnum,
} from '@lib/common/constants/bullmq.constant';
import { ContractAllJobs } from '@lib/common/interfaces/bullmq.interface';
import { Processor } from '@nestjs/bullmq';
import { ContractsService } from '../../apis/landlord/contracts/contracts.service';

@Processor(BullmqQueuesEnum.CONTRACT)
export class ContractAmendmentProcessor extends BaseProcessor {
  constructor(private readonly contractsService: ContractsService) {
    super();
  }

  async process(job: ContractAllJobs) {
    switch (job.name) {
      case BullmqContractJobEnum.APPLY_AMENDMENT: {
        await this.contractsService.applyAmendmentById(job.data.amendmentId);
        break;
      }
      default: {
        this.logger.warn(`Unknown job name: ${(job as any).name}`);
      }
    }
  }
}
