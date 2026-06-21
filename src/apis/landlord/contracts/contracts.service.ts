import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import {
  BullmqContractJobEnum,
  BullmqQueuesEnum,
  defaultBullmqJobOptions,
} from '@lib/common/constants/bullmq.constant';
import { ContractJobDataMap } from '@lib/common/interfaces/bullmq.interface';
import { Contract } from '@entities/contract.entity';
import { ContractDocument } from '@entities/contract-document.entity';
import { ContractAmendment } from '@entities/contract-amendment.entity';
import { ContractAmendmentService as ContractAmendmentServiceEntity } from '@entities/contract-amendment-service.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Room } from '@entities/room.entity';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Invoice } from '@entities/invoice.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import {
  AmendmentType,
  ContractStatus,
  DocumentType,
  RoomStatus,
  RoomType,
} from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import {
  DateFormatEnum,
  DEFAULT_TIMEZONE,
} from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { UploadsService } from '../../../uploads/uploads.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { GetContractsDto } from './dto/get-contracts.dto';
import { CreateAmendmentDto } from './dto/create-amendment.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { AddOccupantDto } from './dto/add-occupant.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,

    @InjectRepository(ContractDocument)
    private readonly contractDocumentRepo: Repository<ContractDocument>,

    @InjectRepository(ContractAmendment)
    private readonly contractAmendmentRepo: Repository<ContractAmendment>,

    @InjectRepository(ContractServiceEntity)
    private readonly contractServiceRepo: Repository<ContractServiceEntity>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(RoomServiceEntity)
    private readonly roomServiceRepo: Repository<RoomServiceEntity>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,

    private readonly uploadsService: UploadsService,

    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    private readonly dataSource: DataSource,

    @InjectQueue(BullmqQueuesEnum.CONTRACT)
    private readonly contractQueue: Queue<ContractJobDataMap[BullmqContractJobEnum.APPLY_AMENDMENT]>,
  ) {}

  async findAll(
    dto: GetContractsDto,
    landlord: User,
  ): Promise<PaginatedResult<Contract>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.contractRepo
      .createQueryBuilder('contract')
      .innerJoinAndSelect('contract.room', 'room')
      .innerJoinAndSelect('room.property', 'property')
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.roomId) {
      qb.andWhere('contract.roomId = :roomId', { roomId: dto.roomId });
    }
    if (dto.propertyId) {
      qb.andWhere('room.propertyId = :propertyId', {
        propertyId: dto.propertyId,
      });
    }
    if (dto.status) {
      qb.andWhere('contract.status = :status', { status: dto.status });
    }
    if (dto.search) {
      qb.andWhere('room.roomNumber LIKE :search', {
        search: `%${dto.search}%`,
      });
    }

    qb.orderBy(`contract.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, landlord: User) {
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    this.assertOwnership(contract, landlord.id);

    const [occupants, services, documents, amendments] = await Promise.all([
      this.roomOccupantRepo.find({
        where: { contractId: id },
        relations: { tenant: true },
      }),
      this.contractServiceRepo.find({
        where: { contractId: id },
        relations: { service: true },
      }),
      this.contractDocumentRepo.find({
        where: { contractId: id },
        order: { createdAt: 'DESC' },
      }),
      this.contractAmendmentRepo.find({
        where: { contractId: id },
        relations: { document: true },
        order: { effectiveDate: 'DESC' },
      }),
    ]);

    return { ...contract, occupants, services, documents, amendments };
  }

  async create(
    dto: CreateContractDto,
    landlord: User,
    file: Express.Multer.File,
  ): Promise<Contract> {
    // --- Validation (reads only, outside transaction) ---
    const room = await this.roomRepo.findOne({
      where: { id: dto.roomId },
      relations: { property: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập phòng này');

    if (room.status === RoomStatus.MAINTENANCE)
      throw new BadRequestException(
        'Phòng đang bảo trì, không thể ký hợp đồng',
      );

    if (room.roomType === RoomType.PRIVATE) {
      const existing = await this.contractRepo.count({
        where: { roomId: dto.roomId, status: ContractStatus.ACTIVE },
      });
      if (existing > 0)
        throw new BadRequestException('Phòng đã có hợp đồng đang hoạt động');
    }

    if (room.roomType === RoomType.SHARED && dto.occupants.length !== 1) {
      throw new BadRequestException(
        'Phòng ghép chỉ được có 1 người ở mỗi hợp đồng',
      );
    }

    if (room.maxOccupants) {
      if (room.roomType === RoomType.SHARED) {
        const activeCount = await this.contractRepo.count({
          where: { roomId: dto.roomId, status: ContractStatus.ACTIVE },
        });
        if (activeCount >= room.maxOccupants)
          throw new BadRequestException(
            `Phòng đã đạt giới hạn ${room.maxOccupants} người ở`,
          );
      } else if (dto.occupants.length > room.maxOccupants) {
        throw new BadRequestException(
          `Phòng chỉ chứa tối đa ${room.maxOccupants} người ở`,
        );
      }
    }

    const ownerCount = dto.occupants.filter((o) => o.isOwner).length;
    if (ownerCount !== 1)
      throw new BadRequestException(
        'Phải có đúng 1 người đại diện',
      );

    for (const occ of dto.occupants) {
      if (occ.movedInDate < dto.startDate) {
        throw new BadRequestException(
          'Ngày chuyển vào không được trước ngày bắt đầu hợp đồng',
        );
      }
      const tenant = await this.tenantRepo.findOne({
        where: { id: occ.tenantId, landlordId: landlord.id },
      });
      if (!tenant)
        throw new NotFoundException(
          `Không tìm thấy khách thuê: ${occ.tenantId}`,
        );
      await this.assertTenantHasNoActiveContract(occ.tenantId);
    }

    // Phòng phải có ít nhất 1 dịch vụ được gắn (room_services)
    const roomServices = await this.roomServiceRepo.find({
      where: { roomId: dto.roomId },
    });
    if (roomServices.length === 0)
      throw new BadRequestException(
        'Phòng chưa có dịch vụ nào. Vui lòng thêm dịch vụ cho phòng trước khi tạo hợp đồng.',
      );

    const fileUrl = this.uploadsService.getFileUrl('contracts', file.filename);

    // --- Writes: tất cả trong 1 transaction ---
    return this.dataSource.transaction(async (manager) => {
      const contract = manager.create(Contract, {
        roomId: dto.roomId,
        rentAmount: dto.rentAmount,
        depositAmount: dto.depositAmount,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        notes: dto.notes,
        status: ContractStatus.ACTIVE,
      });
      const saved = await manager.save(Contract, contract);

      await manager.update(Room, dto.roomId, { status: RoomStatus.OCCUPIED });

      const occupants = dto.occupants.map((o) =>
        manager.create(RoomOccupant, {
          contractId: saved.id,
          tenantId: o.tenantId,
          isOwner: o.isOwner,
          movedInDate: new Date(o.movedInDate),
        }),
      );
      await manager.save(RoomOccupant, occupants);

      // Auto-copy room_services → contract_services (snapshot giá tại thời điểm ký)
      const contractServices = roomServices.map((rs) =>
        manager.create(ContractServiceEntity, {
          contractId: saved.id,
          serviceId: rs.serviceId,
          unitPrice: rs.unitPrice,
        }),
      );
      await manager.save(ContractServiceEntity, contractServices);

      const doc = manager.create(ContractDocument, {
        contractId: saved.id,
        type: DocumentType.CONTRACT,
        fileName: file.originalname,
        fileUrl,
        uploadedById: landlord.id,
      });
      await manager.save(ContractDocument, doc);

      return saved;
    });
  }

  async createAmendment(
    id: string,
    dto: CreateAmendmentDto,
    file: Express.Multer.File,
    landlord: User,
  ) {
    // --- Validation (reads only, outside transaction) ---
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    this.assertOwnership(contract, landlord.id);

    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException(
        'Chỉ có thể tạo phụ lục cho hợp đồng đang hoạt động',
      );

    const pendingAmendment = await this.contractAmendmentRepo.findOne({
      where: { contractId: id, isApplied: false },
    });
    if (pendingAmendment)
      throw new BadRequestException(
        'Hợp đồng đang có phụ lục chưa được áp dụng. Vui lòng chờ phụ lục hiện tại có hiệu lực trước khi tạo mới.',
      );

    const room = contract.room as Room;
    if (dto.serviceChanges?.length) {
      for (const change of dto.serviceChanges) {
        if (!change.contractServiceId && !change.serviceId)
          throw new BadRequestException(
            'Mỗi dịch vụ phải có contractServiceId hoặc serviceId',
          );
        if (change.contractServiceId) {
          const cs = await this.contractServiceRepo.findOne({
            where: { id: change.contractServiceId, contractId: id },
          });
          if (!cs)
            throw new NotFoundException(
              `Không tìm thấy dịch vụ hợp đồng: ${change.contractServiceId}`,
            );
        } else if (change.serviceId) {
          // Dịch vụ phải có trong room_services của phòng
          const roomService = await this.roomServiceRepo.findOne({
            where: { roomId: room.id, serviceId: change.serviceId },
            relations: { service: true },
          });
          if (!roomService)
            throw new BadRequestException(
              `Dịch vụ không có trong danh sách dịch vụ của phòng. Hãy thêm dịch vụ vào phòng trước.`,
            );
          const exists = await this.contractServiceRepo.findOne({
            where: { serviceId: change.serviceId, contractId: id },
          });
          if (exists)
            throw new BadRequestException(
              `Dịch vụ "${roomService.service.name}" đã có trong hợp đồng`,
            );
        }
      }
    }

    if (dto.addOccupants?.length) {
      for (const occ of dto.addOccupants) {
        const tenant = await this.tenantRepo.findOne({
          where: { id: occ.tenantId, landlordId: landlord.id },
        });
        if (!tenant)
          throw new NotFoundException(
            `Không tìm thấy khách thuê: ${occ.tenantId}`,
          );
      }
    }

    const fileUrl = this.uploadsService.getFileUrl('contracts', file.filename);

    // --- Writes: tất cả trong 1 transaction ---
    const result = await this.dataSource.transaction(async (manager) => {
      const doc = manager.create(ContractDocument, {
        contractId: id,
        type: DocumentType.AMENDMENT,
        fileName: file.originalname,
        fileUrl,
        uploadedById: landlord.id,
      });
      const savedDoc = await manager.save(ContractDocument, doc);

      const [d, m, y] = dto.effectiveDate.split('-').reverse();
      const typeLabel =
        dto.amendmentType === AmendmentType.RENEWAL
          ? 'Gia hạn hợp đồng'
          : dto.amendmentType === AmendmentType.PRICE_ADJUSTMENT
            ? 'Điều chỉnh giá'
            : 'Phụ lục bổ sung';
      const generatedTitle = `${typeLabel} - ${d}/${m}/${y}`;

      const amendment = manager.create(ContractAmendment, {
        contractId: id,
        documentId: savedDoc.id,
        amendmentType: dto.amendmentType,
        title: generatedTitle,
        effectiveDate: new Date(dto.effectiveDate),
        newRentAmount: (dto.newRentAmount ?? null) as unknown as number,
        newEndDate: dto.newEndDate
          ? new Date(dto.newEndDate)
          : (null as unknown as Date),
        notes: dto.notes,
        isApplied: false,
      });
      const savedAmendment = await manager.save(ContractAmendment, amendment);

      if (dto.serviceChanges?.length) {
        const deferredChanges: ContractAmendmentServiceEntity[] = [];
        for (const change of dto.serviceChanges) {
          if (change.serviceId) {
            // Dịch vụ mới — thêm vào contract_services ngay, không deferred
            const newCs = manager.create(ContractServiceEntity, {
              contractId: id,
              serviceId: change.serviceId,
              unitPrice: change.newUnitPrice,
            });
            await manager.save(ContractServiceEntity, newCs);
          } else if (change.contractServiceId) {
            // Dịch vụ hiện có — deferred đến effectiveDate
            deferredChanges.push(
              manager.create(ContractAmendmentServiceEntity, {
                amendmentId: savedAmendment.id,
                contractServiceId: change.contractServiceId,
                newUnitPrice: change.newUnitPrice,
              }),
            );
          }
        }
        if (deferredChanges.length) {
          await manager.save(ContractAmendmentServiceEntity, deferredChanges);
        }
      }

      if (dto.addOccupants?.length) {
        const newOccupants = dto.addOccupants.map((occ) =>
          manager.create(RoomOccupant, {
            contractId: id,
            tenantId: occ.tenantId,
            isOwner: occ.isOwner,
            movedInDate: new Date(occ.movedInDate),
          }),
        );
        await manager.save(RoomOccupant, newOccupants);
      }

      if (dto.removeOccupantIds?.length) {
        const toUpdate = await manager.find(RoomOccupant, {
          where: {
            id: In(dto.removeOccupantIds),
            contractId: id,
            isOwner: false,
            movedOutDate: IsNull(),
          },
        });
        if (toUpdate.length) {
          toUpdate.forEach((o) => (o.movedOutDate = new Date()));
          await manager.save(RoomOccupant, toUpdate);
        }
      }

      // Nếu effectiveDate <= hôm nay (VN) → apply ngay trong cùng transaction
      const todayVn = DateUtils.getFormatDateInTimezone(
        new Date(),
        DEFAULT_TIMEZONE,
        DateFormatEnum.YYYY_MM_DD,
      );
      if (dto.effectiveDate <= todayVn) {
        const contractUpdates: Partial<Contract> = {};
        if (savedAmendment.newRentAmount != null)
          contractUpdates.rentAmount = savedAmendment.newRentAmount;
        if (savedAmendment.newEndDate != null)
          contractUpdates.endDate = savedAmendment.newEndDate;
        if (Object.keys(contractUpdates).length > 0)
          await manager.update(Contract, id, contractUpdates);

        const svcChanges = await manager.find(ContractAmendmentServiceEntity, {
          where: { amendmentId: savedAmendment.id },
        });
        for (const sc of svcChanges) {
          await manager.update(ContractServiceEntity, sc.contractServiceId, {
            unitPrice: sc.newUnitPrice,
          });
        }

        savedAmendment.isApplied = true;
        await manager.save(ContractAmendment, savedAmendment);
      }

      return savedAmendment;
    });  // end transaction — result captured above

    // Nếu chưa apply ngay (effectiveDate trong tương lai) → enqueue delayed job
    if (!result.isApplied) {
      const effectiveDateVn = new Date(
        `${dto.effectiveDate}T00:00:00+07:00`,
      );
      const delayMs = Math.max(0, effectiveDateVn.getTime() - Date.now());
      await this.contractQueue.add(
        BullmqContractJobEnum.APPLY_AMENDMENT,
        { amendmentId: result.id },
        { ...defaultBullmqJobOptions, delay: delayMs },
      );
    }

    return result;
  }

  async terminate(
    id: string,
    dto: TerminateContractDto,
    landlord: User,
  ): Promise<Contract> {
    // --- Validation (reads only, outside transaction) ---
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    this.assertOwnership(contract, landlord.id);

    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException(
        'Chỉ có thể chấm dứt hợp đồng đang hoạt động',
      );

    // --- Writes: tất cả trong 1 transaction ---
    return this.dataSource.transaction(async (manager) => {
      contract.status = ContractStatus.TERMINATED;
      contract.terminatedDate = new Date(dto.terminatedDate);
      contract.terminatedReason = (dto.terminatedReason ??
        null) as unknown as string;
      const saved = await manager.save(Contract, contract);

      await manager.update(Room, contract.roomId, {
        status: RoomStatus.AVAILABLE,
      });

      const occupants = await manager.find(RoomOccupant, {
        where: { contractId: id, movedOutDate: IsNull() },
      });
      if (occupants.length) {
        const terminatedDate = new Date(dto.terminatedDate);
        occupants.forEach((o) => (o.movedOutDate = terminatedDate));
        await manager.save(RoomOccupant, occupants);
      }

      return saved;
    });
  }

  async remove(id: string, landlord: User): Promise<void> {
    // --- Validation (reads only, outside transaction) ---
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    this.assertOwnership(contract, landlord.id);

    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException('Chỉ có thể xóa hợp đồng đang hoạt động');

    const invoiceCount = await this.invoiceRepo.count({
      where: { contractId: id },
    });
    if (invoiceCount > 0)
      throw new BadRequestException('Không thể xóa hợp đồng đã có hóa đơn');

    // Lấy danh sách file trước khi xóa (dùng sau khi transaction thành công)
    const documents = await this.contractDocumentRepo.find({
      where: { contractId: id },
    });

    // --- Writes: tất cả trong 1 transaction, đúng thứ tự FK ---
    await this.dataSource.transaction(async (manager) => {
      // 1. Xóa contract_amendment_services trước (ref cả amendments lẫn contract_services)
      const amendments = await manager.find(ContractAmendment, {
        where: { contractId: id },
        select: { id: true },
      });
      if (amendments.length) {
        await manager.delete(ContractAmendmentServiceEntity, {
          amendmentId: In(amendments.map((a) => a.id)),
        });
      }

      // 2. Xóa contract_amendments (ref contract_documents qua document_id)
      await manager.delete(ContractAmendment, { contractId: id });

      // 3. Xóa các bảng con còn lại (không còn FK chéo nhau)
      await manager.delete(RoomOccupant, { contractId: id });
      await manager.delete(ContractServiceEntity, { contractId: id });
      await manager.delete(ContractDocument, { contractId: id });

      // 4. Xóa contract + cập nhật trạng thái phòng
      await manager.remove(Contract, contract);
      await manager.update(Room, contract.roomId, {
        status: RoomStatus.AVAILABLE,
      });
    });

    // Xóa file vật lý SAU KHI transaction thành công
    for (const doc of documents) {
      await this.uploadsService.deleteFile(doc.fileUrl);
    }
  }

  async addOccupant(
    id: string,
    dto: AddOccupantDto,
    landlord: User,
  ): Promise<RoomOccupant> {
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    this.assertOwnership(contract, landlord.id);

    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException(
        'Chỉ có thể thêm người ở cho hợp đồng đang hoạt động',
      );

    const room = contract.room as Room;
    if (room.roomType === RoomType.SHARED)
      throw new BadRequestException(
        'Phòng ghép: mỗi người ở cần hợp đồng riêng',
      );

    if (room.maxOccupants) {
      const currentCount = await this.roomOccupantRepo.count({
        where: { contractId: id, movedOutDate: IsNull() },
      });
      if (currentCount >= room.maxOccupants)
        throw new BadRequestException(
          `Phòng đã đạt giới hạn ${room.maxOccupants} người ở`,
        );
    }

    const contractStartStr = contract.startDate as unknown as string;
    if (dto.movedInDate < contractStartStr)
      throw new BadRequestException(
        'Ngày chuyển vào không được trước ngày bắt đầu hợp đồng',
      );

    const tenant = await this.tenantRepo.findOne({
      where: { id: dto.tenantId, landlordId: landlord.id },
    });
    if (!tenant) throw new NotFoundException('Không tìm thấy khách thuê');

    await this.assertTenantHasNoActiveContract(dto.tenantId);

    const existing = await this.roomOccupantRepo.findOne({
      where: { contractId: id, tenantId: dto.tenantId, movedOutDate: IsNull() },
    });
    if (existing)
      throw new BadRequestException(
        'Khách thuê đã là người ở trong hợp đồng này',
      );

    const occupant = this.roomOccupantRepo.create({
      contractId: id,
      tenantId: dto.tenantId,
      isOwner: false,
      movedInDate: new Date(dto.movedInDate),
    });
    return this.roomOccupantRepo.save(occupant);
  }

  async removeOccupant(
    contractId: string,
    occupantId: string,
    landlord: User,
  ): Promise<void> {
    const contract = await this.contractRepo.findOne({
      where: { id: contractId },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    this.assertOwnership(contract, landlord.id);

    if (contract.status !== ContractStatus.ACTIVE)
      throw new BadRequestException(
        'Chỉ có thể xóa người ở khỏi hợp đồng đang hoạt động',
      );

    const room = contract.room as Room;
    if (room.roomType === RoomType.SHARED)
      throw new BadRequestException('Phòng ghép không hỗ trợ thao tác này');

    const occupant = await this.roomOccupantRepo.findOne({
      where: { id: occupantId, contractId },
    });
    if (!occupant) throw new NotFoundException('Không tìm thấy người ở');
    if (occupant.isOwner)
      throw new BadRequestException(
        'Không thể xóa người đại diện hợp đồng',
      );
    if (occupant.movedOutDate)
      throw new BadRequestException('Người ở này đã rời đi');

    const todayVn = DateUtils.getFormatDateInTimezone(
      new Date(),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );
    occupant.movedOutDate = new Date(todayVn);
    await this.roomOccupantRepo.save(occupant);
  }

  // Cron gọi để lấy danh sách ID cần apply, sau đó enqueue vào worker
  async findDueAmendmentIds(): Promise<string[]> {
    const todayVn = DateUtils.getFormatDateInTimezone(
      new Date(),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );

    const amendments = await this.contractAmendmentRepo
      .createQueryBuilder('a')
      .select('a.id')
      .where('a.effectiveDate <= :today', { today: todayVn })
      .andWhere('a.isApplied = :isApplied', { isApplied: false })
      .getMany();

    return amendments.map((a) => a.id);
  }

  // Worker gọi để apply từng amendment theo ID
  async applyAmendmentById(amendmentId: string): Promise<void> {
    const amendment = await this.contractAmendmentRepo.findOne({
      where: { id: amendmentId },
    });
    if (!amendment) return;
    await this.applyAmendment(amendment);
  }

  private async applyAmendment(amendment: ContractAmendment): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const updates: Partial<Contract> = {};
      if (amendment.newRentAmount != null)
        updates.rentAmount = amendment.newRentAmount;
      if (amendment.newEndDate != null) updates.endDate = amendment.newEndDate;

      if (Object.keys(updates).length > 0) {
        await manager.update(Contract, amendment.contractId, updates);
      }

      const serviceChanges = await manager.find(
        ContractAmendmentServiceEntity,
        {
          where: { amendmentId: amendment.id },
        },
      );
      for (const change of serviceChanges) {
        await manager.update(ContractServiceEntity, change.contractServiceId, {
          unitPrice: change.newUnitPrice,
        });
      }

      amendment.isApplied = true;
      await manager.save(ContractAmendment, amendment);
    });
  }

  // Cron gọi mỗi ngày để expire hợp đồng hết hạn
  async expireContracts(): Promise<number> {
    const todayVn = DateUtils.getFormatDateInTimezone(
      new Date(),
      DEFAULT_TIMEZONE,
      DateFormatEnum.YYYY_MM_DD,
    );

    const expiredContracts = await this.contractRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.roomId'])
      .where('c.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('c.endDate < :today', { today: todayVn })
      .getMany();

    if (!expiredContracts.length) return 0;

    await this.dataSource.transaction(async (manager) => {
      const contractIds = expiredContracts.map((c) => c.id);
      const roomIds = expiredContracts.map((c) => c.roomId);

      await manager.update(Contract, contractIds, {
        status: ContractStatus.EXPIRED,
      });
      await manager.update(Room, roomIds, { status: RoomStatus.AVAILABLE });
    });

    return expiredContracts.length;
  }

  private assertOwnership(contract: Contract, landlordId: string): void {
    const prop = (contract.room as any)?.property;
    if (!prop || prop.landlordId !== landlordId) {
      throw new ForbiddenException('Không có quyền truy cập hợp đồng này');
    }
  }

  private async assertTenantHasNoActiveContract(tenantId: string): Promise<void> {
    const activeOccupancy = await this.roomOccupantRepo
      .createQueryBuilder('ro')
      .innerJoin('ro.contract', 'c', 'c.status = :status', {
        status: ContractStatus.ACTIVE,
      })
      .where('ro.tenantId = :tenantId', { tenantId })
      .andWhere('ro.movedOutDate IS NULL')
      .getOne();

    if (activeOccupancy)
      throw new BadRequestException(
        'Khách thuê đang có hợp đồng hoạt động, không thể thêm vào hợp đồng khác',
      );
  }
}
