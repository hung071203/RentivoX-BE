import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CRON_OPTIONS, DateFormatEnum, DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { InvoicesService } from '../apis/landlord/invoices/invoices.service';

// Chạy lúc 1:00 SA ngày 1 mỗi tháng — tạo hóa đơn cho tháng trước
const FIRST_OF_MONTH_1AM = '0 1 1 * *';

@Injectable()
export class InvoiceCron {
  private readonly logger = new Logger(InvoiceCron.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @Cron(FIRST_OF_MONTH_1AM, CRON_OPTIONS)
  async generateMonthlyInvoices() {
    this.logger.log('Bắt đầu tạo hóa đơn tháng...');
    try {
      const todayVn = DateUtils.getFormatDateInTimezone(
        new Date(),
        DEFAULT_TIMEZONE,
        DateFormatEnum.YYYY_MM_DD,
      );
      const [year, month] = todayVn.split('-').map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const periodDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

      const contracts = await this.invoicesService.findAllActiveContracts();
      let created = 0;
      let skipped = 0;

      for (const contract of contracts) {
        try {
          await this.invoicesService.generateForContract(contract, periodDate);
          created++;
        } catch (err: any) {
          skipped++;
          this.logger.warn(`Skip contract ${contract.id}: ${err.message}`);
        }
      }

      this.logger.log(
        `Hóa đơn tháng hoàn tất — tạo: ${created}, bỏ qua: ${skipped}`,
      );
    } catch (err) {
      this.logger.error('Lỗi khi tạo hóa đơn tháng:', err);
    }
  }
}
