import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from '@entities/payment.entity';
import { Invoice } from '@entities/invoice.entity';
import { User } from '@entities/user.entity';
import { InvoiceStatus, PaymentSource } from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { generatePaymentReferenceCode } from '@lib/helpers/app.helper';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    dto: GetPaymentsDto,
    landlord: User,
  ): Promise<PaginatedResult<any>> {
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
      .leftJoin('p.recordedBy', 'recorder')
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
        'recorder.id',
        'recorder.fullName',
      ])
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.invoiceId) {
      qb.andWhere('inv.id = :invoiceId', { invoiceId: dto.invoiceId });
    }
    if (dto.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: dto.propertyId });
    }
    if (dto.paymentMethod) {
      qb.andWhere('p.paymentMethod = :paymentMethod', {
        paymentMethod: dto.paymentMethod,
      });
    }

    if (dto.source) {
      qb.andWhere('p.source = :source ', {
        source: dto.source,
      });
    }

    if (dto.referenceCode) {
      qb.andWhere('p.referenceCode LIKE :referenceCode', {
        referenceCode: `%${dto.referenceCode}%`,
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

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, landlord: User): Promise<any> {
    const payment = await this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.invoice', 'inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .leftJoin('p.recordedBy', 'recorder')
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
        'recorder.id',
        'recorder.fullName',
      ])
      .where('p.id = :id', { id })
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!payment) throw new NotFoundException('Không tìm thấy thanh toán');
    return payment;
  }

  async create(dto: CreatePaymentDto, landlord: User): Promise<any> {
    // Validate outside transaction
    const inv = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .where('inv.id = :id', { id: dto.invoiceId })
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (inv.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        'Không thể ghi nhận thanh toán cho hóa đơn đã hủy',
      );
    }
    if (inv.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn đã được thanh toán đầy đủ');
    }

    // Tổng đã thanh toán
    const { paidTotal } = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'paidTotal')
      .where('p.invoiceId = :invoiceId', { invoiceId: dto.invoiceId })
      .getRawOne();

    const paymentId = await this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        paymentDate: new Date(),
        paymentMethod: dto.paymentMethod,
        source: PaymentSource.MANUAL,
        referenceCode: generatePaymentReferenceCode(),
        notes: dto.notes,
        recordedById: landlord.id,
      });
      await manager.save(payment);

      const newTotal = Number(paidTotal) + dto.amount;
      if (newTotal >= Number(inv.totalAmount)) {
        await manager.update(Invoice, inv.id, {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        });
      }

      return payment.id;
    });

    return this.findOne(paymentId, landlord);
  }
}
