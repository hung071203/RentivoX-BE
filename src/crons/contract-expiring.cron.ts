import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CRON_OPTIONS, DateFormatEnum, DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { ContractStatus, NotificationType } from '@lib/common/enums';
import { DateUtils } from '@lib/utils/date.util';
import { Contract } from '@entities/contract.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ContractExpiringCron {
  private readonly logger = new Logger(ContractExpiringCron.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    private readonly notificationsService: NotificationsService,
  ) {}

  // Chạy mỗi ngày lúc 8:00 SA — nhắc HĐ sắp hết hạn sau đúng 30 ngày
  @Cron('0 8 * * *', CRON_OPTIONS)
  async notifyExpiringContracts() {
    this.logger.log('Đang kiểm tra hợp đồng sắp hết hạn...');
    try {
      const todayVn = DateUtils.getFormatDateInTimezone(
        new Date(),
        DEFAULT_TIMEZONE,
        DateFormatEnum.YYYY_MM_DD,
      );
      const targetDate = this.addDays(todayVn, 30);

      const contracts = await this.contractRepo
        .createQueryBuilder('c')
        .innerJoin('c.room', 'room')
        .innerJoin('room.property', 'property')
        .addSelect(['room.id', 'room.roomNumber', 'property.id', 'property.landlordId'])
        .where('c.status = :status', { status: ContractStatus.ACTIVE })
        .andWhere('DATE(c.endDate) = :targetDate', { targetDate })
        .getMany();

      if (!contracts.length) {
        this.logger.log('Không có hợp đồng nào sắp hết hạn.');
        return;
      }

      const contractIds = contracts.map((c) => c.id);

      const ownerOccupants = await this.roomOccupantRepo
        .createQueryBuilder('ro')
        .innerJoin('ro.tenant', 't')
        .leftJoin('t.user', 'u')
        .addSelect(['t.id', 'u.id'])
        .where('ro.contractId IN (:...ids)', { ids: contractIds })
        .andWhere('ro.isOwner = true')
        .andWhere('ro.movedOutDate IS NULL')
        .getMany();

      const ownerMap = new Map(
        ownerOccupants.map((ro) => [
          ro.contractId,
          (ro.tenant as any)?.user?.id as string | undefined,
        ]),
      );

      let sent = 0;
      for (const contract of contracts) {
        const room = (contract as any).room;
        const landlordId = room?.property?.landlordId as string | undefined;
        const tenantUserId = ownerMap.get(contract.id);
        const roomLabel = room?.roomNumber ? `phòng ${room.roomNumber}` : '';
        const endDateStr = this.formatDate(contract.endDate);

        if (landlordId) {
          await this.notificationsService.create({
            userId: landlordId,
            type: NotificationType.CONTRACT_EXPIRING_SOON,
            title: 'Hợp đồng sắp hết hạn',
            message: `Hợp đồng${roomLabel ? ` ${roomLabel}` : ''} sẽ hết hạn vào ${endDateStr} (còn 30 ngày).`,
            data: { contractId: contract.id },
          });
          sent++;
        }

        if (tenantUserId) {
          await this.notificationsService.create({
            userId: tenantUserId,
            type: NotificationType.CONTRACT_EXPIRING_SOON,
            title: 'Hợp đồng sắp hết hạn',
            message: `Hợp đồng của bạn sẽ hết hạn vào ${endDateStr} (còn 30 ngày).`,
            data: { contractId: contract.id },
          });
          sent++;
        }
      }

      this.logger.log(`Đã gửi ${sent} thông báo HĐ sắp hết hạn.`);
    } catch (err) {
      this.logger.error('Lỗi khi gửi thông báo HĐ sắp hết hạn:', err);
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
