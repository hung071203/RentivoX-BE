import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Payment } from '@entities/payment.entity';
import { Invoice } from '@entities/invoice.entity';
import { User } from '@entities/user.entity';
import { InvoiceStatus, PaymentMethod, PaymentSource } from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { generatePaymentReferenceCode } from '@lib/helpers/app.helper';
import {
  DateFormatEnum,
  DEFAULT_TIMEZONE,
} from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';

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

  async exportExcel(dto: GetPaymentsDto, landlord: User): Promise<Buffer> {
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
      qb.andWhere('p.source = :source', { source: dto.source });
    }
    if (dto.referenceCode) {
      qb.andWhere('p.referenceCode LIKE :referenceCode', {
        referenceCode: `%${dto.referenceCode}%`,
      });
    }

    qb.orderBy('p.paymentDate', OrderDirection.DESC);
    const payments = await qb.getMany();

    const methodLabel: Record<string, string> = {
      [PaymentMethod.CASH]: 'Tiền mặt',
      [PaymentMethod.TRANSFER]: 'Chuyển khoản',
      [PaymentMethod.OTHER]: 'Khác',
    };
    const sourceLabel: Record<string, string> = {
      [PaymentSource.MANUAL]: 'Thủ công',
      [PaymentSource.AUTOMATIC]: 'Tự động',
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Thanh toán');

    ws.columns = [
      { header: 'Mã TT', key: 'referenceCode', width: 22 },
      { header: 'Mã HĐ', key: 'invoiceNumber', width: 20 },
      { header: 'Phòng', key: 'room', width: 10 },
      { header: 'Nhà trọ', key: 'property', width: 25 },
      { header: 'Số tiền (VND)', key: 'amount', width: 16 },
      { header: 'Phương thức', key: 'method', width: 16 },
      { header: 'Nguồn', key: 'source', width: 12 },
      { header: 'Ngày thanh toán', key: 'paymentDate', width: 17 },
      { header: 'Người ghi nhận', key: 'recorder', width: 22 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    for (const p of payments) {
      const inv = (p as any).invoice;
      const room = (p as any).invoice?.contract?.room;
      const property = room?.property;
      const recorder = (p as any).recordedBy;

      ws.addRow({
        referenceCode: p.referenceCode ?? '',
        invoiceNumber: inv?.invoiceNumber ?? '',
        room: room?.roomNumber ?? '',
        property: property?.name ?? '',
        amount: Number(p.amount),
        method: methodLabel[p.paymentMethod] ?? p.paymentMethod,
        source: sourceLabel[p.source] ?? p.source,
        paymentDate: p.paymentDate
          ? this.formatDateDMY(p.paymentDate)
          : '',
        recorder: recorder?.fullName ?? '',
      });
    }

    ws.getColumn('amount').numFmt = '#,##0';

    return workbook.xlsx.writeBuffer().then((ab) => Buffer.from(ab));
  }

  private formatDateDMY(date: Date | string): string {
    const str = DateUtils.getFormatDateInTimezone(
      new Date(date),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    return str.split('-').reverse().join('/');
  }
}
