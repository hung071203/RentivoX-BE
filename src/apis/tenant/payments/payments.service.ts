import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '@entities/payment.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { GetTenantPaymentsDto } from './dto/get-payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { userId } });
    if (!tenant) throw new NotFoundException('Không tìm thấy thông tin khách thuê');
    return tenant.id;
  }

  async findAll(
    dto: GetTenantPaymentsDto,
    user: User,
  ): Promise<PaginatedResult<any>> {
    const tenantId = await this.getTenantId(user.id);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'paymentDate';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.invoice', 'inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .addSelect([
        'inv.id',
        'inv.invoiceNumber',
        'inv.period',
        'inv.totalAmount',
        'inv.status',
        'c.id',
        'c.contractNumber',
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

    if (dto.paymentMethod) {
      qb.andWhere('p.paymentMethod = :paymentMethod', {
        paymentMethod: dto.paymentMethod,
      });
    }

    const validOrderFields: Record<string, string> = {
      paymentDate: 'p.paymentDate',
      amount: 'p.amount',
      createdAt: 'p.createdAt',
    };
    const orderField = validOrderFields[orderBy] ?? 'p.paymentDate';

    qb.orderBy(orderField, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: User): Promise<any> {
    const tenantId = await this.getTenantId(user.id);

    const payment = await this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.invoice', 'inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .addSelect([
        'inv.id',
        'inv.invoiceNumber',
        'inv.period',
        'inv.totalAmount',
        'inv.status',
        'c.id',
        'c.contractNumber',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
      ])
      .where('p.id = :id', { id })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM room_occupants ro
          WHERE ro.contract_id = c.id
          AND ro.tenant_id = :tenantId
        )`,
        { tenantId },
      )
      .getOne();

    if (!payment) throw new NotFoundException('Không tìm thấy thanh toán');
    return payment;
  }
}
