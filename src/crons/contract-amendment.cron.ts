import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BullmqContractJobEnum } from '@lib/common/constants/bullmq.constant';
import { CRON_OPTIONS } from '@lib/common/constants/app.constant';
import { ContractsService } from '../apis/landlord/contracts/contracts.service';
import { WorkersService } from '../workers/workers.service';

@Injectable()
export class ContractAmendmentCron {
  private readonly logger = new Logger(ContractAmendmentCron.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly workersService: WorkersService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, CRON_OPTIONS)
  async applyDueAmendments() {
    this.logger.log('Đang kiểm tra phụ lục đến hạn...');
    try {
      const amendmentIds = await this.contractsService.findDueAmendmentIds();
      for (const amendmentId of amendmentIds) {
        await this.workersService.sendContractJob(
          BullmqContractJobEnum.APPLY_AMENDMENT,
          { amendmentId },
        );
      }
      this.logger.log(`Đã enqueue ${amendmentIds.length} phụ lục vào queue.`);
    } catch (err) {
      this.logger.error('Lỗi khi enqueue phụ lục:', err);
    }
  }
}
