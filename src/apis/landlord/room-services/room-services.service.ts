import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Room } from '@entities/room.entity';
import { Service } from '@entities/service.entity';
import { Contract } from '@entities/contract.entity';
import { User } from '@entities/user.entity';
import { ContractStatus } from '@lib/common/enums';
import { CreateRoomServiceDto } from './dto/create-room-service.dto';
import { UpdateRoomServiceDto } from './dto/update-room-service.dto';

@Injectable()
export class RoomServicesService {
  constructor(
    @InjectRepository(RoomServiceEntity)
    private readonly roomServiceRepo: Repository<RoomServiceEntity>,

    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,

    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
  ) {}

  async findByRoom(roomId: string, landlord: User): Promise<RoomServiceEntity[]> {
    const room = await this.loadRoom(roomId, landlord);
    if (!room) throw new NotFoundException('Không tìm thấy phòng');

    return this.roomServiceRepo.find({
      where: { roomId },
      relations: { service: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    roomId: string,
    dto: CreateRoomServiceDto,
    landlord: User,
  ): Promise<RoomServiceEntity> {
    const room = await this.loadRoom(roomId, landlord);
    if (!room) throw new NotFoundException('Không tìm thấy phòng');

    // Service phải thuộc cùng property với phòng
    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId, propertyId: room.propertyId },
    });
    if (!service)
      throw new NotFoundException(
        'Không tìm thấy dịch vụ thuộc nhà trọ này',
      );

    // Kiểm tra duplicate
    const existing = await this.roomServiceRepo.findOne({
      where: { roomId, serviceId: dto.serviceId },
    });
    if (existing)
      throw new ConflictException(
        `Dịch vụ "${service.name}" đã được gắn vào phòng này`,
      );

    const rs = this.roomServiceRepo.create({
      roomId,
      serviceId: dto.serviceId,
      unitPrice: dto.unitPrice,
    });
    const saved = await this.roomServiceRepo.save(rs);
    saved.service = service;
    return saved;
  }

  async update(
    roomId: string,
    id: string,
    dto: UpdateRoomServiceDto,
    landlord: User,
  ): Promise<RoomServiceEntity> {
    const rs = await this.loadRoomService(roomId, id, landlord);
    rs.unitPrice = dto.unitPrice;
    await this.roomServiceRepo.save(rs);
    return this.loadRoomService(roomId, id, landlord);
  }

  async remove(roomId: string, id: string, landlord: User): Promise<void> {
    const rs = await this.loadRoomService(roomId, id, landlord);

    // Block nếu phòng có contract đang active
    const activeCount = await this.contractRepo.count({
      where: { roomId, status: ContractStatus.ACTIVE },
    });
    if (activeCount > 0)
      throw new BadRequestException(
        'Không thể xóa dịch vụ khi phòng đang có hợp đồng hoạt động',
      );

    await this.roomServiceRepo.remove(rs);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async loadRoom(roomId: string, landlord: User): Promise<Room | null> {
    const room = await this.roomRepo
      .createQueryBuilder('room')
      .innerJoin('room.property', 'property')
      .addSelect(['property.id', 'property.landlordId'])
      .where('room.id = :roomId', { roomId })
      .andWhere('property.landlordId = :landlordId', { landlordId: landlord.id })
      .getOne();
    return room;
  }

  private async loadRoomService(
    roomId: string,
    id: string,
    landlord: User,
  ): Promise<RoomServiceEntity> {
    const room = await this.loadRoom(roomId, landlord);
    if (!room) throw new NotFoundException('Không tìm thấy phòng');

    const rs = await this.roomServiceRepo.findOne({
      where: { id, roomId },
      relations: { service: true },
    });
    if (!rs) throw new NotFoundException('Không tìm thấy dịch vụ phòng');

    return rs;
  }
}
