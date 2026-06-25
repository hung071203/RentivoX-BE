import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Contract } from '@entities/contract.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { ContractStatus } from '@lib/common/enums';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    @InjectRepository(RoomServiceEntity)
    private readonly roomServiceRepo: Repository<RoomServiceEntity>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { userId } });
    if (!tenant) throw new NotFoundException('Không tìm thấy thông tin khách thuê');
    return tenant.id;
  }

  async findCurrentRoom(user: User): Promise<any> {
    const tenantId = await this.getTenantId(user.id);

    // Tìm occupancy hiện tại (active contract, chưa rời đi)
    const occupancy = await this.roomOccupantRepo
      .createQueryBuilder('ro')
      .innerJoin('ro.contract', 'c')
      .where('ro.tenantId = :tenantId', { tenantId })
      .andWhere('ro.movedOutDate IS NULL')
      .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
      .select(['ro.contractId', 'ro.isOwner', 'ro.movedInDate'])
      .getOne();

    if (!occupancy) {
      throw new NotFoundException('Bạn chưa có phòng đang thuê');
    }

    const contract = await this.contractRepo.findOne({
      where: { id: occupancy.contractId },
      relations: { room: { property: true } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');

    const room = contract.room as any;

    const [services, occupants] = await Promise.all([
      this.roomServiceRepo.find({
        where: { roomId: room.id },
        relations: { service: true },
      }),
      this.roomOccupantRepo.find({
        where: { contractId: contract.id, movedOutDate: IsNull() },
        relations: { tenant: true },
      }),
    ]);

    return {
      ...room,
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        rentAmount: contract.rentAmount,
        depositAmount: contract.depositAmount,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: contract.status,
      },
      services,
      occupants,
    };
  }
}
