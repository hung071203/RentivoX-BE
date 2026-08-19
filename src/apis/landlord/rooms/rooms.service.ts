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
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { User } from '@entities/user.entity';
import { ContractStatus, RoomStatus } from '@lib/common/enums';
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

    @InjectRepository(RoomServiceEntity)
    private readonly roomServiceRepo: Repository<RoomServiceEntity>,
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

    if (items.length > 0) {
      const roomIds = items.map((r) => r.id);
      const counts: { roomId: string; cnt: string }[] = await this.roomRepo.query(
        `SELECT c.room_id AS roomId, COUNT(ro.id) AS cnt
         FROM room_occupants ro
         INNER JOIN contracts c ON c.id = ro.contract_id
         WHERE c.room_id IN (?) AND c.status = ? AND ro.moved_out_date IS NULL
         GROUP BY c.room_id`,
        [roomIds, 'active'],
      );
      const countMap = new Map(counts.map((r) => [r.roomId, Number(r.cnt)]));
      items.forEach((r) => (r.occupantCount = countMap.get(r.id) ?? 0));
    }

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

    const counts: { cnt: string }[] = await this.roomRepo.query(
      `SELECT COUNT(ro.id) AS cnt
       FROM room_occupants ro
       INNER JOIN contracts c ON c.id = ro.contract_id
       WHERE c.room_id = ? AND c.status = ? AND ro.moved_out_date IS NULL`,
      [id, 'active'],
    );
    room.occupantCount = Number(counts[0]?.cnt ?? 0);

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

    if (dto.roomType && dto.roomType !== room.roomType) {
      const activeContractCount = await this.contractRepo.count({
        where: { roomId: room.id, status: ContractStatus.ACTIVE },
      });
      if (activeContractCount > 0)
        throw new BadRequestException(
          'Không thể thay đổi loại phòng khi đang có hợp đồng còn hiệu lực',
        );
    }

    if (dto.maxOccupants !== undefined && dto.maxOccupants < (room.occupantCount ?? 0)) {
      throw new BadRequestException(
        `Số người tối đa không được nhỏ hơn số người đang ở hiện tại (${room.occupantCount})`,
      );
    }

    if (dto.status && dto.status !== room.status) {
      if (room.status === RoomStatus.OCCUPIED)
        throw new BadRequestException(
          'Không thể thay đổi trạng thái phòng đang có người thuê. Hãy chấm dứt hợp đồng trước.',
        );
      const validTransitions: Record<RoomStatus, RoomStatus[]> = {
        [RoomStatus.AVAILABLE]: [RoomStatus.MAINTENANCE, RoomStatus.RESERVED],
        [RoomStatus.MAINTENANCE]: [RoomStatus.AVAILABLE],
        [RoomStatus.RESERVED]: [RoomStatus.AVAILABLE],
        [RoomStatus.OCCUPIED]: [],
      };
      if (!validTransitions[room.status].includes(dto.status))
        throw new BadRequestException(
          `Không thể chuyển trạng thái từ "${room.status}" sang "${dto.status}"`,
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

    // Phòng có bất kỳ hợp đồng nào (kể cả đã terminated/expired) hoặc còn
    // room_services đều có FK tham chiếu tới phòng — xóa thẳng sẽ crash 500
    // do vi phạm foreign key constraint ở tầng DB. Chặn sớm với thông báo rõ.
    const anyContracts = await this.contractRepo.count({
      where: { roomId: room.id },
    });
    if (anyContracts > 0) {
      throw new BadRequestException(
        'Không thể xóa phòng đã từng có hợp đồng (kể cả đã kết thúc) — dữ liệu này cần giữ lại cho lịch sử',
      );
    }

    const roomServiceCount = await this.roomServiceRepo.count({
      where: { roomId: room.id },
    });
    if (roomServiceCount > 0) {
      throw new BadRequestException(
        'Không thể xóa phòng còn dịch vụ gắn kèm — hãy gỡ hết dịch vụ khỏi phòng trước',
      );
    }

    await this.roomRepo.remove(room);
  }
}
