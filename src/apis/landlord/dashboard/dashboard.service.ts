import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '@entities/room.entity';
import { Contract } from '@entities/contract.entity';
import { Invoice } from '@entities/invoice.entity';
import { Payment } from '@entities/payment.entity';
import { User } from '@entities/user.entity';
import { ContractStatus, InvoiceStatus, RoomStatus } from '@lib/common/enums';
import { DEFAULT_TIMEZONE, DateFormatEnum } from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { dayjs } from '@lib/utils/dayjs.util';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
  ) {}

  async getDashboard(user: User) {
    const landlordId = user.id;
    const tz = DEFAULT_TIMEZONE;

    const today = DateUtils.getFormatDateInTimezone(new Date(), tz, DateFormatEnum.YYYY_MM_DD);
    const startOfMonth = dayjs().tz(tz).startOf('month').format('YYYY-MM-DD');
    const in30Days = dayjs(today).add(30, 'day').format('YYYY-MM-DD');
    const sixMonthsAgo = dayjs().tz(tz).subtract(5, 'month').startOf('month').format('YYYY-MM-DD');

    const [
      roomStats,
      activeContracts,
      revenueThisMonth,
      unpaidStats,
      expiringContracts,
      recentPayments,
      revenueChart,
    ] = await Promise.all([
      // 1. Room stats grouped by status
      this.roomRepo
        .createQueryBuilder('r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .select('r.status', 'status')
        .addSelect('COUNT(r.id)', 'count')
        .groupBy('r.status')
        .getRawMany(),

      // 2. Active contracts count
      this.contractRepo
        .createQueryBuilder('c')
        .innerJoin('c.room', 'r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
        .getCount(),

      // 3. Revenue this month (sum of payments)
      this.paymentRepo
        .createQueryBuilder('pay')
        .innerJoin('pay.invoice', 'inv')
        .innerJoin('inv.contract', 'c')
        .innerJoin('c.room', 'r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .andWhere('pay.paymentDate >= :startOfMonth', { startOfMonth })
        .select('COALESCE(SUM(pay.amount), 0)', 'total')
        .addSelect('COUNT(pay.id)', 'count')
        .getRawOne(),

      // 4. Unpaid invoices
      this.invoiceRepo
        .createQueryBuilder('inv')
        .innerJoin('inv.contract', 'c')
        .innerJoin('c.room', 'r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .andWhere('inv.status = :status', { status: InvoiceStatus.UNPAID })
        .select('COUNT(inv.id)', 'count')
        .addSelect('COALESCE(SUM(inv.totalAmount), 0)', 'total')
        .getRawOne(),

      // 5. Contracts expiring in next 30 days
      this.contractRepo
        .createQueryBuilder('c')
        .innerJoin('c.room', 'r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
        .andWhere('c.endDate >= :today', { today })
        .andWhere('c.endDate <= :in30Days', { in30Days })
        .select('c.id', 'id')
        .addSelect('c.contractNumber', 'contractNumber')
        .addSelect('c.endDate', 'endDate')
        .addSelect('r.roomNumber', 'roomNumber')
        .addSelect('p.name', 'propertyName')
        .orderBy('c.endDate', 'ASC')
        .limit(5)
        .getRawMany(),

      // 6. Recent payments (5 latest)
      this.paymentRepo
        .createQueryBuilder('pay')
        .innerJoin('pay.invoice', 'inv')
        .innerJoin('inv.contract', 'c')
        .innerJoin('c.room', 'r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .select('pay.id', 'id')
        .addSelect('pay.amount', 'amount')
        .addSelect('pay.paymentDate', 'paymentDate')
        .addSelect('pay.paymentMethod', 'paymentMethod')
        .addSelect('pay.referenceCode', 'referenceCode')
        .addSelect('inv.invoiceNumber', 'invoiceNumber')
        .addSelect('inv.period', 'period')
        .addSelect('r.roomNumber', 'roomNumber')
        .addSelect('p.name', 'propertyName')
        .orderBy('pay.createdAt', 'DESC')
        .limit(5)
        .getRawMany(),

      // 7. Revenue by month (last 6 months)
      this.paymentRepo
        .createQueryBuilder('pay')
        .innerJoin('pay.invoice', 'inv')
        .innerJoin('inv.contract', 'c')
        .innerJoin('c.room', 'r')
        .innerJoin('r.property', 'p')
        .where('p.landlordId = :landlordId', { landlordId })
        .andWhere('pay.paymentDate >= :sixMonthsAgo', { sixMonthsAgo })
        .select("DATE_FORMAT(pay.paymentDate, '%Y-%m')", 'month')
        .addSelect('SUM(pay.amount)', 'total')
        .groupBy("DATE_FORMAT(pay.paymentDate, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany(),
    ]);

    // Process room stats
    const roomMap: Record<string, number> = {};
    for (const row of roomStats) roomMap[row.status] = Number(row.count);
    const totalRooms = Object.values(roomMap).reduce((s, n) => s + n, 0);
    const occupiedRooms = roomMap[RoomStatus.OCCUPIED] ?? 0;

    // Fill in 0 for months without payments
    const chartMap: Record<string, number> = {};
    for (const row of revenueChart) chartMap[row.month] = Number(row.total);
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const month = dayjs().tz(tz).subtract(5 - i, 'month').format('YYYY-MM');
      return { month, total: chartMap[month] ?? 0 };
    });

    return {
      rooms: {
        total: totalRooms,
        available: roomMap[RoomStatus.AVAILABLE] ?? 0,
        occupied: occupiedRooms,
        maintenance: roomMap[RoomStatus.MAINTENANCE] ?? 0,
        reserved: roomMap[RoomStatus.RESERVED] ?? 0,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
      activeContracts,
      revenueThisMonth: {
        total: Number(revenueThisMonth?.total ?? 0),
        paymentCount: Number(revenueThisMonth?.count ?? 0),
      },
      unpaidInvoices: {
        count: Number(unpaidStats?.count ?? 0),
        total: Number(unpaidStats?.total ?? 0),
      },
      expiringContracts,
      recentPayments,
      monthlyRevenue,
    };
  }
}
