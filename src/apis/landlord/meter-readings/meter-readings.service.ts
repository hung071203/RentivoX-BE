import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterReading } from '@entities/meter-reading.entity';
import { Room } from '@entities/room.entity';
import { Service } from '@entities/service.entity';
import { ContractService } from '@entities/contract-service.entity';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Invoice } from '@entities/invoice.entity';
import { User } from '@entities/user.entity';
import { ContractStatus, InvoiceStatus, ServiceType } from '@lib/common/enums';
import {
  DateFormatEnum,
  DEFAULT_TIMEZONE,
} from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { UpdateMeterReadingDto } from './dto/update-meter-reading.dto';
import { GetMeterReadingsDto } from './dto/get-meter-readings.dto';

@Injectable()
export class MeterReadingsService {
  constructor(
    @InjectRepository(MeterReading)
    private readonly meterReadingRepo: Repository<MeterReading>,

    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,

    @InjectRepository(ContractService)
    private readonly contractServiceRepo: Repository<ContractService>,

    @InjectRepository(RoomServiceEntity)
    private readonly roomServiceRepo: Repository<RoomServiceEntity>,

    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  async findAll(
    dto: GetMeterReadingsDto,
    landlord: User,
  ): Promise<PaginatedResult<any>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'period';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.meterReadingRepo
      .createQueryBuilder('mr')
      .innerJoin('mr.room', 'room')
      .innerJoin('room.property', 'property')
      .innerJoin('mr.service', 'svc')
      .leftJoin('mr.recordedBy', 'rb')
      .addSelect([
        'room.id',
        'room.roomNumber',
        'room.roomType',
        'room.propertyId',
        'property.id',
        'property.name',
        'svc.id',
        'svc.name',
        'svc.unit',
        'svc.unitPrice',
        'rb.id',
        'rb.fullName',
      ])
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: dto.propertyId });
    }
    if (dto.roomId) {
      qb.andWhere('room.id = :roomId', { roomId: dto.roomId });
    }
    if (dto.serviceId) {
      qb.andWhere('svc.id = :serviceId', { serviceId: dto.serviceId });
    }
    if (dto.period) {
      qb.andWhere('mr.period = :period', { period: dto.period });
    }

    qb.orderBy(`mr.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const contractCountMap = await this.loadContractCounts(items);

    return {
      items: items.map((mr) => this.enrich(mr, contractCountMap)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, landlord: User): Promise<any> {
    const mr = await this.meterReadingRepo
      .createQueryBuilder('mr')
      .innerJoin('mr.room', 'room')
      .innerJoin('room.property', 'property')
      .innerJoin('mr.service', 'svc')
      .leftJoin('mr.recordedBy', 'rb')
      .addSelect([
        'room.id',
        'room.roomNumber',
        'room.roomType',
        'room.propertyId',
        'property.id',
        'property.name',
        'svc.id',
        'svc.name',
        'svc.unit',
        'svc.unitPrice',
        'rb.id',
        'rb.fullName',
      ])
      .where('mr.id = :id', { id })
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!mr) throw new NotFoundException('Không tìm thấy bản ghi chỉ số');

    const contractCountMap = await this.loadContractCounts([mr]);
    return this.enrich(mr, contractCountMap);
  }

  async create(dto: CreateMeterReadingDto, landlord: User): Promise<any> {
    if (dto.valueEnd < dto.valueStart) {
      throw new BadRequestException(
        'Chỉ số cuối kỳ không được nhỏ hơn chỉ số đầu kỳ',
      );
    }

    // Only allow current month or previous month
    const todayVn = DateUtils.getFormatDateInTimezone(
      new Date(),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    const [curYear, curMonth] = todayVn.split('-').map(Number);
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    const [pYear, pMonth] = dto.period.split('-').map(Number);
    const isCurrentMonth = pYear === curYear && pMonth === curMonth;
    const isPrevMonth = pYear === prevYear && pMonth === prevMonth;
    if (!isCurrentMonth && !isPrevMonth) {
      throw new BadRequestException(
        'Chỉ được ghi chỉ số cho tháng hiện tại hoặc tháng trước',
      );
    }

    // Verify room ownership
    const room = await this.roomRepo
      .createQueryBuilder('room')
      .innerJoin('room.property', 'property')
      .addSelect(['property.id', 'property.landlordId'])
      .where('room.id = :id', { id: dto.roomId })
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!room) throw new NotFoundException('Không tìm thấy phòng');

    // Service must belong to room's property, be metered and active
    const service = await this.serviceRepo
      .createQueryBuilder('svc')
      .where('svc.id = :id', { id: dto.serviceId })
      .andWhere('svc.propertyId = :propertyId', { propertyId: room.propertyId })
      .andWhere('svc.type = :type', { type: ServiceType.METERED })
      .andWhere('svc.isActive = :isActive', { isActive: true })
      .getOne();

    if (!service) {
      throw new NotFoundException(
        'Không tìm thấy dịch vụ đo đếm cho nhà trọ này',
      );
    }

    // Service must be attached to this room via room_services
    const roomService = await this.roomServiceRepo.findOne({
      where: { roomId: dto.roomId, serviceId: dto.serviceId },
    });

    if (!roomService) {
      throw new BadRequestException(
        `Dịch vụ "${service.name}" chưa được gắn vào phòng này`,
      );
    }

    // No duplicate reading for same room + service + period
    const duplicate = await this.meterReadingRepo
      .createQueryBuilder('mr')
      .where('mr.roomId = :roomId', { roomId: dto.roomId })
      .andWhere('mr.serviceId = :serviceId', { serviceId: dto.serviceId })
      .andWhere('mr.period = :period', { period: dto.period })
      .getOne();
    if (duplicate) {
      throw new BadRequestException(
        'Đã tồn tại bản ghi chỉ số cho dịch vụ này trong kỳ này',
      );
    }

    const mr = this.meterReadingRepo.create({
      roomId: dto.roomId,
      serviceId: dto.serviceId,
      period: new Date(dto.period),
      valueStart: dto.valueStart,
      valueEnd: dto.valueEnd,
      recordedAt: new Date(),
      recordedById: landlord.id,
    });

    const saved = await this.meterReadingRepo.save(mr);
    return this.findOne(saved.id, landlord);
  }

  async update(
    id: string,
    dto: UpdateMeterReadingDto,
    landlord: User,
  ): Promise<any> {
    const mr = await this.loadForMutation(id, landlord);

    const valueStart = dto.valueStart ?? Number(mr.valueStart);
    const valueEnd = dto.valueEnd ?? Number(mr.valueEnd);
    if (valueEnd < valueStart) {
      throw new BadRequestException(
        'Chỉ số cuối kỳ không được nhỏ hơn chỉ số đầu kỳ',
      );
    }

    if (dto.valueStart !== undefined) mr.valueStart = dto.valueStart;
    if (dto.valueEnd !== undefined) mr.valueEnd = dto.valueEnd;

    await this.meterReadingRepo.save(mr);
    return this.findOne(id, landlord);
  }

  async remove(id: string, landlord: User): Promise<void> {
    const mr = await this.loadForMutation(id, landlord);
    await this.meterReadingRepo.remove(mr);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async loadForMutation(
    id: string,
    landlord: User,
  ): Promise<MeterReading> {
    const mr = await this.meterReadingRepo
      .createQueryBuilder('mr')
      .innerJoin('mr.room', 'room')
      .innerJoin('room.property', 'property')
      .where('mr.id = :id', { id })
      .andWhere('property.landlordId = :landlordId', {
        landlordId: landlord.id,
      })
      .getOne();

    if (!mr) throw new NotFoundException('Không tìm thấy bản ghi chỉ số');
    await this.assertInvoiceNotExists(mr.roomId, mr.period);
    return mr;
  }

  // Block if any invoice exists for any contract in this room for the period
  private async assertInvoiceNotExists(
    roomId: string,
    period: Date | string,
  ): Promise<void> {
    const paid = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.contract', 'c')
      .where('c.roomId = :roomId', { roomId })
      .andWhere('inv.period = :period', { period })
      .andWhere('inv.status IN (:...statuses)', {
        statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PAID],
      })
      .getOne();

    if (paid) {
      throw new BadRequestException(
        'Không thể thay đổi bản ghi chỉ số vì đã có hóa đơn cho kỳ này',
      );
    }
  }

  // Count active contracts per room+service for shared room billing display
  private async loadContractCounts(
    items: MeterReading[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!items.length) return map;

    const roomIds = [...new Set(items.map((mr) => mr.roomId))];

    const rows = await this.contractServiceRepo
      .createQueryBuilder('cs')
      .innerJoin('cs.contract', 'c')
      .select('c.roomId', 'roomId')
      .addSelect('cs.serviceId', 'serviceId')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.roomId IN (:...roomIds)', { roomIds })
      .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
      .groupBy('c.roomId')
      .addGroupBy('cs.serviceId')
      .getRawMany();

    rows.forEach((r) => {
      map.set(`${r.roomId}:${r.serviceId}`, Number(r.cnt));
    });

    return map;
  }

  private enrich(mr: MeterReading, contractCountMap: Map<string, number>): any {
    const consumption = Number(mr.valueEnd) - Number(mr.valueStart);
    const unitPrice = Number(mr.service?.unitPrice ?? 0);
    const contractCount =
      contractCountMap.get(`${mr.roomId}:${mr.serviceId}`) ?? 1;
    const amountPerContract = consumption * unitPrice;
    const totalAmount = amountPerContract * contractCount;
    return {
      ...mr,
      consumption,
      contractCount,
      unitPrice,
      amountPerContract,
      totalAmount,
    };
  }
}
