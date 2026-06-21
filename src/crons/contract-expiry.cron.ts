import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CRON_OPTIONS } from '@lib/common/constants/app.constant';
import { ContractsService } from '../apis/landlord/contracts/contracts.service';

@Injectable()
export class ContractExpiryCron {
  private readonly logger = new Logger(ContractExpiryCron.name);

  constructor(private readonly contractsService: ContractsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, CRON_OPTIONS)
  async expireContracts() {
    this.logger.log('Đang kiểm tra hợp đồng hết hạn...');
    try {
      const count = await this.contractsService.expireContracts();
      this.logger.log(`Đã expire ${count} hợp đồng.`);
    } catch (err) {
      this.logger.error('Lỗi khi expire hợp đồng:', err);
    }
  }
}
