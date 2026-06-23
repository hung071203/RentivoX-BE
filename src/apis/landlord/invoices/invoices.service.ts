import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '@entities/invoice.entity';
import { InvoiceItem } from '@entities/invoice-item.entity';
import { Contract } from '@entities/contract.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { MeterReading } from '@entities/meter-reading.entity';
import { User } from '@entities/user.entity';
import { ContractStatus, InvoiceStatus, ServiceType } from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { DateFormatEnum, DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepo: Repository<InvoiceItem>,

    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,

    @InjectRepository(ContractServiceEntity)
    private readonly contractServiceRepo: Repository<ContractServiceEntity>,

    @InjectRepository(MeterReading)
    private readonly meterReadingRepo: Repository<MeterReading>,

    private readonly dataSource: DataSource,
  ) {}

  async findAll(dto: GetInvoicesDto, landlord: User): Promise<PaginatedResult<any>> {
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
        'c.id', 'c.rentAmount', 'c.startDate', 'c.endDate',
        'room.id', 'room.roomNumber',
        'property.id', 'property.name',
      ])
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: dto.propertyId });
    }
    if (dto.roomId) {
      qb.andWhere('room.id = :roomId', { roomId: dto.roomId });
    }
    if (dto.contractId) {
      qb.andWhere('c.id = :contractId', { contractId: dto.contractId });
    }
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

  async findOne(id: string, landlord: User): Promise<any> {
    const inv = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .leftJoinAndSelect('inv.items', 'items')
      .leftJoin('items.contractService', 'cs')
      .leftJoin('cs.service', 'svc')
      .addSelect([
        'c.id', 'c.rentAmount',
        'room.id', 'room.roomNumber',
        'property.id', 'property.name',
        'cs.id', 'cs.serviceId',
        'svc.id', 'svc.name', 'svc.type', 'svc.unit',
      ])
      .where('inv.id = :id', { id })
      .andWhere('property.landlordId = :landlordId', { landlordId: landlord.id })
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    return inv;
  }

  async createManual(dto: CreateInvoiceDto, landlord: User): Promise<any> {
    const periodDate = `${dto.period}-01`;

    const todayVn = DateUtils.getFormatDateInTimezone(
      new Date(),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    if (periodDate > todayVn) {
      throw new BadRequestException('Không thể tạo hóa đơn cho kỳ trong tương lai');
    }

    const contract = await this.loadContractWithOwnership(dto.contractId, landlord.id);
    const invoice = await this.generateForContract(contract, periodDate, dto.notes);
    return this.findOne(invoice.id, landlord);
  }

  async cancel(id: string, landlord: User): Promise<any> {
    const inv = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .where('inv.id = :id', { id })
      .andWhere('property.landlordId = :landlordId', { landlordId: landlord.id })
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (inv.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Không thể hủy hóa đơn đã thanh toán');
    }
    if (inv.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Hóa đơn đã bị hủy rồi');
    }

    inv.status = InvoiceStatus.CANCELLED;
    return this.invoiceRepo.save(inv);
  }

  // Core generation — dùng chung cho createManual và InvoiceCron
  async generateForContract(
    contract: Contract,
    periodDate: string,
    notes?: string,
  ): Promise<Invoice> {
    // Chỉ 1 hóa đơn active (non-cancelled) per contract per period
    const existing = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.contractId = :contractId', { contractId: contract.id })
      .andWhere('inv.period = :period', { period: periodDate })
      .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        `Đã tồn tại hóa đơn cho ${this.formatPeriod(periodDate)} của hợp đồng này`,
      );
    }

    const contractServices = await this.contractServiceRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.service', 'svc')
      .where('cs.contractId = :contractId', { contractId: contract.id })
      .getMany();

    const meteredServices = contractServices.filter(
      (cs) => cs.service.type === ServiceType.METERED,
    );
    const fixedServices = contractServices.filter(
      (cs) => cs.service.type === ServiceType.FIXED,
    );

    // Validate đủ chỉ số cho mọi metered service
    const missingServices: string[] = [];
    const readingMap = new Map<string, MeterReading>();

    for (const cs of meteredServices) {
      const reading = await this.meterReadingRepo
        .createQueryBuilder('mr')
        .where('mr.roomId = :roomId', { roomId: contract.roomId })
        .andWhere('mr.serviceId = :serviceId', { serviceId: cs.serviceId })
        .andWhere('mr.period = :period', { period: periodDate })
        .getOne();

      if (!reading) {
        missingServices.push(cs.service.name);
      } else {
        readingMap.set(cs.serviceId, reading);
      }
    }

    if (missingServices.length > 0) {
      throw new BadRequestException(
        `Chưa có chỉ số ${this.formatPeriod(periodDate)}: ${missingServices.join(', ')}`,
      );
    }

    // Số hợp đồng active cùng phòng (chia đều chỉ số cho phòng ghép)
    const serviceIds = meteredServices.map((cs) => cs.serviceId);
    const contractCountMap = await this.loadContractCountsForRoom(
      contract.roomId,
      serviceIds,
    );

    const periodLabel = this.formatPeriod(periodDate);
    const items: Partial<InvoiceItem>[] = [];

    // Tiền phòng
    items.push({
      description: `Tiền phòng ${periodLabel}`,
      contractServiceId: null,
      quantity: 1,
      unitPrice: Number(contract.rentAmount),
      amount: Number(contract.rentAmount),
    });

    // Dịch vụ cố định
    for (const cs of fixedServices) {
      const unitPrice = Number(cs.unitPrice);
      items.push({
        description: `${cs.service.name} ${periodLabel}`,
        contractServiceId: cs.id,
        quantity: 1,
        unitPrice,
        amount: unitPrice,
      });
    }

    // Dịch vụ đo đếm
    for (const cs of meteredServices) {
      const reading = readingMap.get(cs.serviceId)!;
      const consumption = Number(reading.valueEnd) - Number(reading.valueStart);
      const unitPrice = Number(cs.unitPrice);
      const contractCount = contractCountMap.get(cs.serviceId) ?? 1;
      const quantity = Math.round((consumption / contractCount) * 100) / 100;
      const amount = Math.round((consumption * unitPrice) / contractCount);
      const unitNote = cs.service.unit
        ? contractCount > 1
          ? ` (${consumption} ${cs.service.unit} ÷ ${contractCount})`
          : ` (${consumption} ${cs.service.unit})`
        : '';
      items.push({
        description: `${cs.service.name} ${periodLabel}${unitNote}`,
        contractServiceId: cs.id,
        quantity,
        unitPrice,
        amount,
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount!, 0);
    const dueDate = this.getDueDate(periodDate);

    return this.dataSource.transaction(async (manager) => {
      const invoice = manager.create(Invoice, {
        contractId: contract.id,
        period: new Date(periodDate),
        totalAmount,
        status: InvoiceStatus.UNPAID,
        dueDate,
        notes: notes ?? null,
      });
      const savedInvoice = await manager.save(invoice);

      const invoiceItems = items.map((item) =>
        manager.create(InvoiceItem, { ...item, invoiceId: savedInvoice.id }),
      );
      await manager.save(InvoiceItem, invoiceItems);

      return savedInvoice;
    });
  }

  // Dùng bởi InvoiceCron
  async findAllActiveContracts(): Promise<Contract[]> {
    return this.contractRepo.find({ where: { status: ContractStatus.ACTIVE } });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async loadContractWithOwnership(
    contractId: string,
    landlordId: string,
  ): Promise<Contract> {
    const contract = await this.contractRepo
      .createQueryBuilder('c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .where('c.id = :id', { id: contractId })
      .andWhere('property.landlordId = :landlordId', { landlordId })
      .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
      .getOne();

    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng đang hoạt động');
    return contract;
  }

  private async loadContractCountsForRoom(
    roomId: string,
    serviceIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!serviceIds.length) return map;

    const rows = await this.contractServiceRepo
      .createQueryBuilder('cs')
      .innerJoin('cs.contract', 'c')
      .select('cs.serviceId', 'serviceId')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.roomId = :roomId', { roomId })
      .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('cs.serviceId IN (:...serviceIds)', { serviceIds })
      .groupBy('cs.serviceId')
      .getRawMany();

    rows.forEach((r) => map.set(r.serviceId, Number(r.cnt)));
    return map;
  }

  private formatPeriod(periodDate: string): string {
    const [year, month] = periodDate.split('-');
    return `tháng ${parseInt(month)}/${year}`;
  }

  // Hạn thanh toán = ngày 15 tháng tiếp theo
  private getDueDate(periodDate: string): Date {
    const [year, month] = periodDate.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 15);
  }
}
