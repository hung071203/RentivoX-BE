import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/user.entity';
import { Property } from '@entities/property.entity';
import { Room } from '@entities/room.entity';
import { Contract } from '@entities/contract.entity';
import { Invoice } from '@entities/invoice.entity';
import { ContractStatus, InvoiceStatus, RoomStatus, UserRole } from '@lib/common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  async getStats() {
    const [
      totalUsers,
      totalLandlords,
      totalTenants,
      totalProperties,
      totalRooms,
      availableRooms,
      occupiedRooms,
      activeContracts,
      paidInvoicesThisMonth,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRole.LANDLORD } }),
      this.userRepo.count({ where: { role: UserRole.TENANT } }),
      this.propertyRepo.count(),
      this.roomRepo.count(),
      this.roomRepo.count({ where: { status: RoomStatus.AVAILABLE } }),
      this.roomRepo.count({ where: { status: RoomStatus.OCCUPIED } }),
      this.contractRepo.count({ where: { status: ContractStatus.ACTIVE } }),
      this.invoiceRepo
        .createQueryBuilder('invoice')
        .select('SUM(invoice.totalAmount)', 'total')
        .addSelect('COUNT(invoice.id)', 'count')
        .where('invoice.status = :status', { status: InvoiceStatus.PAID })
        .andWhere('invoice.period >= :startOfMonth', {
          startOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        })
        .getRawOne(),
    ]);

    return {
      users: {
        total: totalUsers,
        landlords: totalLandlords,
        tenants: totalTenants,
      },
      properties: {
        total: totalProperties,
      },
      rooms: {
        total: totalRooms,
        available: availableRooms,
        occupied: occupiedRooms,
      },
      contracts: {
        active: activeContracts,
      },
      revenueThisMonth: {
        total: Number(paidInvoicesThisMonth?.total ?? 0),
        invoiceCount: Number(paidInvoicesThisMonth?.count ?? 0),
      },
    };
  }
}
