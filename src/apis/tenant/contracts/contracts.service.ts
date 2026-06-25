import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '@entities/contract.entity';
import { ContractDocument } from '@entities/contract-document.entity';
import { ContractAmendment } from '@entities/contract-amendment.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { GetTenantContractsDto } from './dto/get-contracts.dto';

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

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { userId } });
    if (!tenant) throw new NotFoundException('Không tìm thấy thông tin khách thuê');
    return tenant.id;
  }

  async findAll(
    dto: GetTenantContractsDto,
    user: User,
  ): Promise<PaginatedResult<Contract>> {
    const tenantId = await this.getTenantId(user.id);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'startDate';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.contractRepo
      .createQueryBuilder('contract')
      .innerJoinAndSelect('contract.room', 'room')
      .innerJoinAndSelect('room.property', 'property')
      .where(
        `EXISTS (
          SELECT 1 FROM room_occupants ro
          WHERE ro.contract_id = contract.id
          AND ro.tenant_id = :tenantId
        )`,
        { tenantId },
      );

    if (dto.status) {
      qb.andWhere('contract.status = :status', { status: dto.status });
    }

    qb.orderBy(`contract.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: User): Promise<any> {
    const tenantId = await this.getTenantId(user.id);

    const hasAccess = await this.roomOccupantRepo.findOne({
      where: { contractId: id, tenantId },
    });
    if (!hasAccess) throw new NotFoundException('Không tìm thấy hợp đồng');

    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');

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
        relations: { document: true, amendmentServices: { contractService: { service: true } } },
        order: { effectiveDate: 'DESC' },
      }),
    ]);

    return { ...contract, occupants, services, documents, amendments };
  }
}
