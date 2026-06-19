import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '@entities/room.entity';
import { Property } from '@entities/property.entity';
import { Contract } from '@entities/contract.entity';
import { User } from '@entities/user.entity';
import { ContractStatus } from '@lib/common/enums';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GetRoomsDto } from './dto/get-rooms.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,

    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
  ) {}

  async findAll(dto: GetRoomsDto, landlord: User): Promise<PaginatedResult<Room>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.roomRepo
      .createQueryBuilder('room')
      .innerJoinAndSelect('room.property', 'property')
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.propertyId) {
      qb.andWhere('room.propertyId = :propertyId', { propertyId: dto.propertyId });
    }

    if (dto.search) {
      qb.andWhere('room.roomNumber LIKE :search', { search: `%${dto.search}%` });
    }

    if (dto.status) {
      qb.andWhere('room.status = :status', { status: dto.status });
    }

    if (dto.roomType) {
      qb.andWhere('room.roomType = :roomType', { roomType: dto.roomType });
    }

    qb.orderBy(`room.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, landlord: User): Promise<Room> {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: { property: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập');
    return room;
  }

  async create(dto: CreateRoomDto, landlord: User): Promise<Room> {
    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
    if (!property) throw new NotFoundException('Không tìm thấy nhà trọ');
    if (property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập nhà trọ này');

    const existing = await this.roomRepo.findOne({
      where: { propertyId: dto.propertyId, roomNumber: dto.roomNumber },
    });
    if (existing)
      throw new ConflictException(
        `Phòng số "${dto.roomNumber}" đã tồn tại trong nhà trọ này`,
      );

    const room = this.roomRepo.create(dto);
    const saved = await this.roomRepo.save(room);
    saved.property = property;
    return saved;
  }

  async update(id: string, dto: UpdateRoomDto, landlord: User): Promise<Room> {
    const room = await this.findOne(id, landlord);

    if (dto.roomNumber && dto.roomNumber !== room.roomNumber) {
      const existing = await this.roomRepo.findOne({
        where: { propertyId: room.propertyId, roomNumber: dto.roomNumber },
      });
      if (existing)
        throw new ConflictException(
          `Phòng số "${dto.roomNumber}" đã tồn tại trong nhà trọ này`,
        );
    }

    Object.assign(room, dto);
    return this.roomRepo.save(room);
  }

  async remove(id: string, landlord: User): Promise<void> {
    const room = await this.findOne(id, landlord);

    const activeContracts = await this.contractRepo.count({
      where: {
        roomId: room.id,
        status: ContractStatus.ACTIVE,
      },
    });
    if (activeContracts > 0) {
      throw new BadRequestException(
        'Không thể xóa phòng đang có hợp đồng còn hiệu lực',
      );
    }

    await this.roomRepo.remove(room);
  }
}
