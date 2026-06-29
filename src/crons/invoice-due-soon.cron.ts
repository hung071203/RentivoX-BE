import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CRON_OPTIONS, DateFormatEnum, DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { InvoiceStatus, NotificationType } from '@lib/common/enums';
import { DateUtils } from '@lib/utils/date.util';
import { Invoice } from '@entities/invoice.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InvoiceDueSoonCron {
  private readonly logger = new Logger(InvoiceDueSoonCron.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    private readonly notificationsService: NotificationsService,
  ) {}

  // Chạy mỗi ngày lúc 8:00 SA — nhắc hóa đơn đến hạn sau đúng 3 ngày
  @Cron('0 8 * * *', CRON_OPTIONS)
  async notifyDueSoonInvoices() {
    this.logger.log('Đang kiểm tra hóa đơn sắp đến hạn...');
    try {
      const todayVn = DateUtils.getFormatDateInTimezone(
        new Date(),
        DEFAULT_TIMEZONE,
        DateFormatEnum.YYYY_MM_DD,
      );

      // Tính ngày = today + 3 (YYYY-MM-DD)
      const dueSoonDate = this.addDays(todayVn, 3);

      const invoices = await this.invoiceRepo
        .createQueryBuilder('inv')
        .select(['inv.id', 'inv.invoiceNumber', 'inv.contractId', 'inv.dueDate'])
        .where('inv.status = :status', { status: InvoiceStatus.UNPAID })
        .andWhere('DATE(inv.dueDate) = :dueDate', { dueDate: dueSoonDate })
        .getMany();

      if (!invoices.length) {
        this.logger.log('Không có hóa đơn nào sắp đến hạn.');
        return;
      }

      let sent = 0;
      for (const invoice of invoices) {
        const ownerOccupant = await this.roomOccupantRepo
          .createQueryBuilder('ro')
          .innerJoin('ro.tenant', 't')
          .leftJoin('t.user', 'u')
          .addSelect(['t.id', 'u.id'])
          .where('ro.contractId = :contractId', { contractId: invoice.contractId })
          .andWhere('ro.isOwner = true')
          .andWhere('ro.movedOutDate IS NULL')
          .getOne();

        const tenantUserId = (ownerOccupant?.tenant as any)?.user?.id as string | undefined;
        if (!tenantUserId) continue;

        await this.notificationsService.create({
          userId: tenantUserId,
          type: NotificationType.INVOICE_DUE_SOON,
          title: 'Hóa đơn sắp đến hạn',
          message: `Hóa đơn ${invoice.invoiceNumber} sẽ đến hạn vào ${this.formatDate(invoice.dueDate)}. Vui lòng thanh toán đúng hạn.`,
          data: { invoiceId: invoice.id },
        });
        sent++;
      }

      this.logger.log(`Đã gửi ${sent} thông báo sắp đến hạn.`);
    } catch (err) {
      this.logger.error('Lỗi khi gửi thông báo hóa đơn sắp đến hạn:', err);
    }
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private formatDate(date: Date): string {
    const str = DateUtils.getFormatDateInTimezone(
      new Date(date),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    return str.split('-').reverse().join('/');
  }
}
