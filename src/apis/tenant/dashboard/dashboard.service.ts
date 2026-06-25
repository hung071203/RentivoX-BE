import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '@entities/contract.entity';
import { Invoice } from '@entities/invoice.entity';
import { Payment } from '@entities/payment.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { ContractStatus, InvoiceStatus } from '@lib/common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,

    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { userId } });
    if (!tenant)
      throw new NotFoundException('Không tìm thấy thông tin khách thuê');
    return tenant.id;
  }

  async getDashboard(user: User): Promise<any> {
    const tenantId = await this.getTenantId(user.id);

    // Tìm hợp đồng active hiện tại
    const activeOccupancy = await this.roomOccupantRepo
      .createQueryBuilder('ro')
      .innerJoin('ro.contract', 'c')
      .where('ro.tenantId = :tenantId', { tenantId })
      .andWhere('ro.movedOutDate IS NULL')
      .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
      .select('ro.contractId')
      .getRawOne();

    let activeContract: any = null;
    let currentRoom: any = null;

    if (activeOccupancy) {
      const contractId: string = activeOccupancy.ro_contractId;
      const contract = await this.contractRepo.findOne({
        where: { id: contractId },
        relations: { room: { property: true } },
      });
      if (contract) {
        const room = contract.room as any;
        activeContract = {
          id: contract.id,
          contractNumber: contract.contractNumber,
          startDate: contract.startDate,
          endDate: contract.endDate,
          rentAmount: contract.rentAmount,
          status: contract.status,
        };
        currentRoom = {
          id: room.id,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          floor: room.floor,
          areaM2: room.areaM2,
          property: {
            id: room.property.id,
            name: room.property.name,
            address: room.property.address,
          },
        };
      }
    }

    // Lấy tất cả contractId của tenant (để query invoice/payment)
    const occupancies = await this.roomOccupantRepo.find({
      where: { tenantId },
      select: { contractId: true },
    });
    const contractIds = [...new Set(occupancies.map((o) => o.contractId))];

    let unpaidInvoiceCount = 0;
    let totalUnpaidAmount = 0;
    let nearestDueDate: Date | null = null;
    let recentPayments: any[] = [];

    if (contractIds.length > 0) {
      // Thống kê hóa đơn chưa trả
      const unpaidStats = await this.invoiceRepo
        .createQueryBuilder('inv')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(inv.totalAmount), 0)', 'total')
        .where('inv.contractId IN (:...contractIds)', { contractIds })
        .andWhere('inv.status = :status', { status: InvoiceStatus.UNPAID })
        .getRawOne();

      unpaidInvoiceCount = Number(unpaidStats.count);
      totalUnpaidAmount = Number(unpaidStats.total);

      // Hóa đơn gần nhất cần thanh toán (hạn sớm nhất)
      const nearestInvoice = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.contractId IN (:...contractIds)', { contractIds })
        .andWhere('inv.status = :status', { status: InvoiceStatus.UNPAID })
        .orderBy('inv.dueDate', 'ASC')
        .select([
          'inv.id',
          'inv.invoiceNumber',
          'inv.dueDate',
          'inv.totalAmount',
          'inv.period',
        ])
        .getOne();

      nearestDueDate = nearestInvoice?.dueDate ?? null;

      // 3 thanh toán gần nhất
      recentPayments = await this.paymentRepo
        .createQueryBuilder('p')
        .innerJoin('p.invoice', 'inv')
        .addSelect(['inv.id', 'inv.invoiceNumber', 'inv.period'])
        .where('inv.contractId IN (:...contractIds)', { contractIds })
        .orderBy('p.paymentDate', 'DESC')
        .limit(3)
        .getMany();
    }

    return {
      currentRoom,
      activeContract,
      unpaidInvoiceCount,
      totalUnpaidAmount,
      nearestDueDate,
      recentPayments,
    };
  }
}
