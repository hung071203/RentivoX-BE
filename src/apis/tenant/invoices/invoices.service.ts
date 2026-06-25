import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '@entities/invoice.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { GetTenantInvoicesDto } from './dto/get-invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,

    private readonly dataSource: DataSource,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { userId } });
    if (!tenant) throw new NotFoundException('Không tìm thấy thông tin khách thuê');
    return tenant.id;
  }

  async findAll(
    dto: GetTenantInvoicesDto,
    user: User,
  ): Promise<PaginatedResult<any>> {
    const tenantId = await this.getTenantId(user.id);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'period';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .addSelect([
        'c.id',
        'c.contractNumber',
        'c.rentAmount',
        'c.startDate',
        'c.endDate',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
      ])
      .where(
        `EXISTS (
          SELECT 1 FROM room_occupants ro
          WHERE ro.contract_id = c.id
          AND ro.tenant_id = :tenantId
        )`,
        { tenantId },
      );

    if (dto.status) {
      qb.andWhere('inv.status = :status', { status: dto.status });
    }
    if (dto.period) {
      qb.andWhere('inv.period = :period', { period: `${dto.period}-01` });
    }

    qb.orderBy(`inv.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: User): Promise<any> {
    const tenantId = await this.getTenantId(user.id);

    const inv = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .leftJoinAndSelect('inv.items', 'items')
      .leftJoin('items.contractService', 'cs')
      .leftJoin('cs.service', 'svc')
      .addSelect([
        'c.id',
        'c.contractNumber',
        'c.rentAmount',
        'c.startDate',
        'c.endDate',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
        'cs.id',
        'cs.serviceId',
        'svc.id',
        'svc.name',
        'svc.type',
        'svc.unit',
      ])
      .where('inv.id = :id', { id })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM room_occupants ro
          WHERE ro.contract_id = c.id
          AND ro.tenant_id = :tenantId
        )`,
        { tenantId },
      )
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    return inv;
  }
}
