import * as fs from 'fs';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Invoice } from '@entities/invoice.entity';
import { InvoiceItem } from '@entities/invoice-item.entity';
import { Contract } from '@entities/contract.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { MeterReading } from '@entities/meter-reading.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { User } from '@entities/user.entity';
import { ContractStatus, InvoiceStatus, ServiceType } from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import {
  DateFormatEnum,
  DEFAULT_TIMEZONE,
} from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { WorkersService } from '../../../workers/workers.service';
import { NotificationsService } from '../../../notifications/notifications.service';
import { BullmqEmailJobEnum } from '@lib/common/constants/bullmq.constant';
import { MailTemplates } from '@lib/common/constants/mail.constant';
import { NotificationType } from '@lib/common/enums';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { generateInvoiceNumber } from '@lib/helpers/app.helper';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

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
    private readonly workersService: WorkersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    dto: GetInvoicesDto,
    landlord: User,
  ): Promise<PaginatedResult<any>> {
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
        'c.rentAmount',
        'c.startDate',
        'c.endDate',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
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
        'c.id',
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
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');

    // Lấy người đại diện (isOwner = true) của hợp đồng
    const ownerOccupant = await this.dataSource
      .getRepository(RoomOccupant)
      .createQueryBuilder('ro')
      .innerJoin('ro.tenant', 't')
      .addSelect(['t.id', 't.fullName', 't.phone', 't.email'])
      .where('ro.contractId = :contractId', { contractId: inv.contractId })
      .andWhere('ro.isOwner = :isOwner', { isOwner: true })
      .getOne();

    (inv.contract as any).owner = ownerOccupant?.tenant ?? null;
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
      throw new BadRequestException(
        'Không thể tạo hóa đơn cho kỳ trong tương lai',
      );
    }

    const contract = await this.loadContractWithOwnership(
      dto.contractId,
      landlord.id,
    );
    const invoice = await this.generateForContract(
      contract,
      periodDate,
      dto.notes,
    );
    return this.findOne(invoice.id, landlord);
  }

  async cancel(id: string, landlord: User): Promise<any> {
    const inv = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .where('inv.id = :id', { id })
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (inv.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Không thể hủy hóa đơn đã thanh toán');
    }
    if (inv.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Hóa đơn đã bị hủy rồi');
    }

    const paymentCount = await this.dataSource
      .getRepository('payments')
      .createQueryBuilder('p')
      .where('p.invoiceId = :invoiceId', { invoiceId: id })
      .getCount();
    if (paymentCount > 0) {
      throw new BadRequestException(
        'Không thể hủy hóa đơn đã có thanh toán',
      );
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
      .andWhere('inv.status != :cancelled', {
        cancelled: InvoiceStatus.CANCELLED,
      })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        `Đã tồn tại hóa đơn cho ${this.formatPeriod(periodDate)} của hợp đồng này`,
      );
    }

    // Validate: period không được trước tháng bắt đầu hợp đồng
    const startDateStr = DateUtils.getFormatDateInTimezone(
      new Date(contract.startDate),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    const contractStartMonth = startDateStr.substring(0, 8) + '01';
    if (periodDate < contractStartMonth) {
      throw new BadRequestException(
        `Hợp đồng bắt đầu ${this.formatPeriod(startDateStr)}, không thể tạo hóa đơn cho kỳ trước đó`,
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

    // Số hợp đồng cùng phòng hoạt động trong kỳ (chia đều chỉ số cho phòng ghép)
    const serviceIds = meteredServices.map((cs) => cs.serviceId);
    const contractCountMap = await this.loadContractCountsForRoom(
      contract.roomId,
      serviceIds,
      periodDate,
    );

    const periodLabel = this.formatPeriod(periodDate);
    const items: Partial<InvoiceItem>[] = [];

    // Tiền phòng — prorate nếu hợp đồng bắt đầu giữa tháng kỳ đó
    const [pYear, pMonth] = periodDate.split('-').map(Number);
    const daysInMonth = new Date(pYear, pMonth, 0).getDate();
    const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);

    const isFirstMonth = sYear === pYear && sMonth === pMonth && sDay > 1;
    const activeDays = isFirstMonth ? daysInMonth - sDay + 1 : daysInMonth;
    const rentFull = Number(contract.rentAmount);
    const rentAmount = isFirstMonth
      ? Math.round((rentFull * activeDays) / daysInMonth)
      : rentFull;
    const rentDescription = isFirstMonth
      ? `Tiền phòng ${periodLabel} (${activeDays}/${daysInMonth} ngày)`
      : `Tiền phòng ${periodLabel}`;

    items.push({
      description: rentDescription,
      contractServiceId: undefined,
      quantity: 1,
      unitPrice: rentAmount,
      amount: rentAmount,
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

    const savedInvoice = await this.dataSource.transaction(async (manager) => {
      // Sinh mã hóa đơn HD-YYYYMM-XXXX theo thứ tự trong kỳ
      const invoiceNumber = generateInvoiceNumber();

      const invoice = manager.create(Invoice, {
        invoiceNumber,
        contractId: contract.id,
        period: new Date(periodDate),
        totalAmount,
        status: InvoiceStatus.UNPAID,
        dueDate,
        notes: notes ?? undefined,
      });
      const savedInvoice = await manager.save(invoice);

      const invoiceItems = items.map((item) =>
        manager.create(InvoiceItem, { ...item, invoiceId: savedInvoice.id }),
      );
      await manager.save(InvoiceItem, invoiceItems);

      return savedInvoice;
    });

    // Gửi email + notification bất đồng bộ — không block response
    this.sendInvoiceCreatedEmail(savedInvoice, contract).catch((err) =>
      this.logger.warn(`Không gửi được email hóa đơn: ${err?.message}`),
    );
    this.sendInvoiceCreatedNotification(savedInvoice, contract).catch((err) =>
      this.logger.warn(`Không gửi được thông báo hóa đơn: ${err?.message}`),
    );

    return savedInvoice;
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

    if (!contract)
      throw new NotFoundException('Không tìm thấy hợp đồng đang hoạt động');
    return contract;
  }

  private async loadContractCountsForRoom(
    roomId: string,
    serviceIds: string[],
    periodDate: string,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!serviceIds.length) return map;

    const [pYear, pMonth] = periodDate.split('-').map(Number);
    const lastDay = new Date(pYear, pMonth, 0).getDate();
    const periodEnd = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await this.contractServiceRepo
      .createQueryBuilder('cs')
      .innerJoin('cs.contract', 'c')
      .select('cs.serviceId', 'serviceId')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.roomId = :roomId', { roomId })
      .andWhere('c.startDate <= :periodEnd', { periodEnd })
      .andWhere(
        new Brackets((qb) => {
          qb.where('c.status = :statusActive', {
            statusActive: ContractStatus.ACTIVE,
          })
            .orWhere(
              'c.status = :statusTerminated AND c.terminatedDate >= :periodStart',
              {
                statusTerminated: ContractStatus.TERMINATED,
                periodStart: periodDate,
              },
            )
            .orWhere(
              'c.status = :statusExpired AND c.endDate >= :periodStart2',
              {
                statusExpired: ContractStatus.EXPIRED,
                periodStart2: periodDate,
              },
            );
        }),
      )
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

  // ─── Excel export ────────────────────────────────────────────────────────────

  async exportExcel(dto: GetInvoicesDto, landlord: User): Promise<Buffer> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .addSelect([
        'c.id',
        'c.rentAmount',
        'c.startDate',
        'c.endDate',
        'room.id',
        'room.roomNumber',
        'property.id',
        'property.name',
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

    qb.orderBy('inv.period', OrderDirection.DESC);
    const invoices = await qb.getMany();

    // Load owner (người đại diện) cho mỗi invoice theo batch
    const contractIds = [...new Set(invoices.map((inv) => inv.contractId))];
    const ownerMap = new Map<string, any>();
    if (contractIds.length > 0) {
      const owners = await this.dataSource
        .getRepository(RoomOccupant)
        .createQueryBuilder('ro')
        .innerJoin('ro.tenant', 't')
        .addSelect(['t.id', 't.fullName', 't.phone'])
        .where('ro.contractId IN (:...contractIds)', { contractIds })
        .andWhere('ro.isOwner = :isOwner', { isOwner: true })
        .getMany();
      owners.forEach((o) => ownerMap.set(o.contractId, (o as any).tenant));
    }

    const statusLabel: Record<string, string> = {
      unpaid: 'Chưa thanh toán',
      paid: 'Đã thanh toán',
      cancelled: 'Đã hủy',
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Hóa đơn');

    ws.columns = [
      { header: 'Mã HĐ', key: 'invoiceNumber', width: 20 },
      { header: 'Kỳ', key: 'period', width: 15 },
      { header: 'Phòng', key: 'room', width: 10 },
      { header: 'Nhà trọ', key: 'property', width: 25 },
      { header: 'Người đại diện', key: 'owner', width: 25 },
      { header: 'Tổng tiền (VND)', key: 'totalAmount', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 18 },
      { header: 'Hạn thanh toán', key: 'dueDate', width: 16 },
      { header: 'Ngày thanh toán', key: 'paidAt', width: 16 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    for (const inv of invoices) {
      const room = (inv as any).contract?.room;
      const property = room?.property;
      const owner = ownerMap.get(inv.contractId);

      const periodStr = inv.period
        ? this.formatPeriodForExcel(inv.period)
        : '';
      const dueDateStr = inv.dueDate ? this.formatDateDMY(inv.dueDate) : '';
      const paidAtStr = inv.paidAt ? this.formatDateDMY(inv.paidAt) : '';

      ws.addRow({
        invoiceNumber: inv.invoiceNumber ?? '',
        period: periodStr,
        room: room?.roomNumber ?? '',
        property: property?.name ?? '',
        owner: owner?.fullName ?? '',
        totalAmount: Number(inv.totalAmount),
        status: statusLabel[inv.status] ?? inv.status,
        dueDate: dueDateStr,
        paidAt: paidAtStr,
      });
    }

    ws.getColumn('totalAmount').numFmt = '#,##0';

    return workbook.xlsx.writeBuffer().then((ab) => Buffer.from(ab));
  }

  private formatPeriodForExcel(period: Date | string): string {
    const str = DateUtils.getFormatDateInTimezone(
      new Date(period),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    const [year, month] = str.split('-');
    return `Tháng ${parseInt(month)}/${year}`;
  }

  // ─── PDF export ──────────────────────────────────────────────────────────────

  async exportPdf(
    id: string,
    landlord: User,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.findOne(id, landlord);
    const buffer = await this.generatePdfBuffer(invoice);
    const filename = `${invoice.invoiceNumber ?? 'hoa-don'}.pdf`;
    return { buffer, filename };
  }

  private generatePdfBuffer(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fontPath = this.getVietnameseFontPath();
      if (fontPath) {
        doc.registerFont('VietFont', fontPath);
        doc.registerFont('VietFont-Bold', fontPath);
        doc.font('VietFont');
      }

      const W = 495;
      const X = 50;

      // ── Header ──────────────────────────────────────────────────────────────
      doc.rect(0, 0, 595, 75).fill('#4f46e5');
      doc.fillColor('#ffffff').font(fontPath ? 'VietFont' : 'Helvetica-Bold')
         .fontSize(20).text('RentivoX', X, 18, { lineBreak: false });
      doc.font(fontPath ? 'VietFont' : 'Helvetica').fontSize(9)
         .fillColor('#c7d2fe').text('He thong quan ly nha tro', X, 44);
      doc.font(fontPath ? 'VietFont' : 'Helvetica-Bold').fontSize(11)
         .fillColor('#ffffff')
         .text('HOA DON TIEN PHONG', X, 26, { width: W, align: 'right', lineBreak: false });

      // ── Meta grid ────────────────────────────────────────────────────────────
      let y = 95;
      const contract = invoice.contract;
      const room = contract?.room;
      const property = room?.property;
      const owner = contract?.owner;

      const period = this.formatPeriod(
        DateUtils.getFormatDateInTimezone(
          new Date(invoice.period), DEFAULT_TIMEZONE, DateFormatEnum.YYYY_MM_DD,
        ),
      );

      const statusLabel: Record<string, string> = {
        unpaid: 'Chua thanh toan',
        paid: 'Da thanh toan',
        cancelled: 'Da huy',
      };

      const col2X = X + 250;

      this.pdfLabelValue(doc, fontPath, X, y, 'Ma hoa don:', invoice.invoiceNumber ?? '—');
      this.pdfLabelValue(doc, fontPath, col2X, y, 'Ky:', period);
      y += 20;
      this.pdfLabelValue(doc, fontPath, X, y, 'Trang thai:', statusLabel[invoice.status] ?? invoice.status);
      this.pdfLabelValue(doc, fontPath, col2X, y, 'Han TT:', this.formatDateDMY(invoice.dueDate));
      if (invoice.paidAt) {
        y += 20;
        this.pdfLabelValue(doc, fontPath, X, y, 'Ngay TT:', this.formatDateDMY(invoice.paidAt));
      }

      // ── Divider ─────────────────────────────────────────────────────────────
      y += 28;
      doc.moveTo(X, y).lineTo(X + W, y).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
      y += 12;

      // ── Property / Room / Tenant ─────────────────────────────────────────────
      this.pdfLabelValue(doc, fontPath, X, y, 'Nha tro:', property?.name ?? '—');
      this.pdfLabelValue(doc, fontPath, col2X, y, 'Phong:', `Phong ${room?.roomNumber ?? '—'}`);
      y += 20;
      if (owner) {
        this.pdfLabelValue(doc, fontPath, X, y, 'Dai dien:', owner.fullName ?? '—');
        this.pdfLabelValue(doc, fontPath, col2X, y, 'SDT:', owner.phone ?? '—');
        y += 20;
      }
      if (contract?.startDate) {
        const range = `${this.formatDateDMY(contract.startDate)} - ${this.formatDateDMY(contract.endDate)}`;
        this.pdfLabelValue(doc, fontPath, X, y, 'Thoi han HĐ:', range);
        y += 20;
      }

      // ── Divider ─────────────────────────────────────────────────────────────
      y += 8;
      doc.moveTo(X, y).lineTo(X + W, y).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
      y += 14;

      // ── Items table ──────────────────────────────────────────────────────────
      doc.font(fontPath ? 'VietFont' : 'Helvetica-Bold').fontSize(10)
         .fillColor('#111827').text('Chi tiet khoan muc:', X, y);
      y += 18;

      // Table header
      const c1 = 290, c2 = 80, c3 = 125;
      doc.rect(X, y, W, 22).fill('#f3f4f6');
      doc.font(fontPath ? 'VietFont' : 'Helvetica-Bold').fontSize(9).fillColor('#374151');
      doc.text('Khoan muc', X + 6, y + 6, { width: c1 - 6 });
      doc.text('So luong', X + c1, y + 6, { width: c2, align: 'right' });
      doc.text('Thanh tien', X + c1 + c2, y + 6, { width: c3 - 6, align: 'right' });
      y += 22;

      // Table rows
      const items: any[] = invoice.items ?? [];
      doc.font(fontPath ? 'VietFont' : 'Helvetica').fontSize(9).fillColor('#111827');
      items.forEach((item: any, i: number) => {
        if (i % 2 === 0) doc.rect(X, y, W, 20).fill('#fafafa');
        doc.fillColor('#111827');
        doc.text(item.description ?? '', X + 6, y + 5, { width: c1 - 6, ellipsis: true });
        doc.text(String(Number(item.quantity)), X + c1, y + 5, { width: c2, align: 'right' });
        doc.text(this.formatCurrencyVnd(Number(item.amount)), X + c1 + c2, y + 5, { width: c3 - 6, align: 'right' });
        y += 20;
      });

      // Total row
      doc.rect(X, y, W, 24).fill('#eef2ff');
      doc.font(fontPath ? 'VietFont' : 'Helvetica-Bold').fontSize(10).fillColor('#4f46e5');
      doc.text('TONG CONG', X + 6, y + 6, { width: c1 + c2 - 6 });
      doc.text(this.formatCurrencyVnd(Number(invoice.totalAmount)), X + c1 + c2, y + 6, { width: c3 - 6, align: 'right' });
      y += 24;

      // Table border
      doc.rect(X, y - (22 + items.length * 20 + 24), W, 22 + items.length * 20 + 24)
         .lineWidth(0.5).strokeColor('#d1d5db').stroke();

      // ── Notes ────────────────────────────────────────────────────────────────
      if (invoice.notes) {
        y += 14;
        doc.font(fontPath ? 'VietFont' : 'Helvetica-Bold').fontSize(9)
           .fillColor('#374151').text('Ghi chu:', X, y);
        y += 14;
        doc.font(fontPath ? 'VietFont' : 'Helvetica').fontSize(9)
           .fillColor('#6b7280').text(invoice.notes, X, y, { width: W });
        y += doc.heightOfString(invoice.notes, { width: W });
      }

      // ── Footer — cố định ở cuối trang, trong vùng nội dung ─────────────────
      const footerY = doc.page.height - doc.page.margins.bottom - 28;
      doc.moveTo(X, footerY).lineTo(X + W, footerY).lineWidth(0.5)
         .strokeColor('#e5e7eb').stroke();
      doc.font(fontPath ? 'VietFont' : 'Helvetica').fontSize(8)
         .fillColor('#9ca3af')
         .text('© 2025 RentivoX — He thong quan ly nha tro thong minh', X, footerY + 8, {
           width: W, align: 'center',
           lineBreak: false,
         });

      doc.end();
    });
  }

  private pdfLabelValue(
    doc: InstanceType<typeof PDFDocument>,
    fontPath: string | undefined,
    x: number,
    y: number,
    label: string,
    value: string,
  ) {
    doc.font(fontPath ? 'VietFont' : 'Helvetica').fontSize(9)
       .fillColor('#6b7280').text(label, x, y, { continued: false, lineBreak: false });
    doc.font(fontPath ? 'VietFont' : 'Helvetica-Bold').fontSize(9)
       .fillColor('#111827').text(value, x + 90, y, { lineBreak: false });
  }

  // ─── Notification ────────────────────────────────────────────────────────────

  private async sendInvoiceCreatedNotification(
    invoice: Invoice,
    contract: Contract,
  ): Promise<void> {
    const ownerOccupant = await this.dataSource
      .getRepository(RoomOccupant)
      .createQueryBuilder('ro')
      .innerJoin('ro.tenant', 't')
      .leftJoin('t.user', 'u')
      .addSelect(['t.id', 'u.id'])
      .where('ro.contractId = :contractId', { contractId: contract.id })
      .andWhere('ro.isOwner = :isOwner', { isOwner: true })
      .getOne();

    const tenantUserId = (ownerOccupant?.tenant as any)?.user?.id;
    if (!tenantUserId) return;

    const periodStr = this.formatPeriod(
      DateUtils.getFormatDateInTimezone(
        new Date(invoice.period),
        DEFAULT_TIMEZONE,
        DateFormatEnum.YYYY_MM_DD,
      ),
    );

    await this.notificationsService.create({
      userId: tenantUserId,
      type: NotificationType.INVOICE_CREATED,
      title: 'Hóa đơn mới',
      message: `Hóa đơn ${invoice.invoiceNumber} kỳ ${periodStr} đã được tạo. Tổng tiền: ${this.formatCurrencyVnd(Number(invoice.totalAmount))}.`,
      data: { invoiceId: invoice.id },
    });
  }

  // ─── Email notification ──────────────────────────────────────────────────────

  private async sendInvoiceCreatedEmail(
    invoice: Invoice,
    contract: Contract,
  ): Promise<void> {
    // Lấy thông tin phòng/nhà trọ
    const contractWithRoom = await this.contractRepo
      .createQueryBuilder('c')
      .innerJoin('c.room', 'room')
      .innerJoin('room.property', 'property')
      .addSelect(['room.id', 'room.roomNumber', 'property.id', 'property.name'])
      .where('c.id = :id', { id: contract.id })
      .getOne();

    // Lấy email người đại diện (user.email ưu tiên, fallback tenant.email)
    const ownerOccupant = await this.dataSource
      .getRepository(RoomOccupant)
      .createQueryBuilder('ro')
      .innerJoin('ro.tenant', 't')
      .leftJoin('t.user', 'u')
      .addSelect(['t.id', 't.fullName', 't.email', 'u.id', 'u.email'])
      .where('ro.contractId = :contractId', { contractId: contract.id })
      .andWhere('ro.isOwner = :isOwner', { isOwner: true })
      .getOne();

    if (!ownerOccupant?.tenant) return;

    const tenant = ownerOccupant.tenant as any;
    const tenantEmail: string = tenant.user?.email ?? tenant.email;
    if (!tenantEmail) return;

    const periodStr = this.formatPeriod(
      DateUtils.getFormatDateInTimezone(
        new Date(invoice.period), DEFAULT_TIMEZONE, DateFormatEnum.YYYY_MM_DD,
      ),
    );

    await this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
      to: tenantEmail,
      template: MailTemplates.INVOICE_CREATED,
      context: {
        tenantName: tenant.fullName,
        invoiceNumber: invoice.invoiceNumber,
        period: periodStr,
        totalAmount: this.formatCurrencyVnd(Number(invoice.totalAmount)),
        dueDate: this.formatDateDMY(invoice.dueDate),
        propertyName: (contractWithRoom as any)?.room?.property?.name ?? '',
        roomNumber: (contractWithRoom as any)?.room?.roomNumber ?? '',
      },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private getVietnameseFontPath(): string | undefined {
    const candidates = [
      'C:/Windows/Fonts/arial.ttf',
      'C:/Windows/Fonts/Arial.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return undefined;
  }

  private formatCurrencyVnd(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' VND';
  }

  private formatDateDMY(date: Date | string): string {
    const str = DateUtils.getFormatDateInTimezone(
      new Date(date), DEFAULT_TIMEZONE, DateFormatEnum.YYYY_MM_DD,
    );
    return str.split('-').reverse().join('/');
  }
}
