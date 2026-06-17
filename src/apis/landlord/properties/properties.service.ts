import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '@entities/property.entity';
import { Room } from '@entities/room.entity';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetPropertiesDto } from './dto/get-properties.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,

    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async findAll(
    dto: GetPropertiesDto,
    landlord: User,
  ): Promise<PaginatedResult<Property>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.search) {
      qb.andWhere(
        '(property.name LIKE :search OR property.address LIKE :search OR property.province LIKE :search OR property.district LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    qb.orderBy(`property.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, landlord: User): Promise<Property> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Không tìm thấy nhà trọ');
    if (property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập');
    return property;
  }

  async create(dto: CreatePropertyDto, landlord: User): Promise<Property> {
    const property = this.propertyRepo.create({
      ...dto,
      landlordId: landlord.id,
    });
    return this.propertyRepo.save(property);
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    landlord: User,
  ): Promise<Property> {
    const property = await this.findOne(id, landlord);
    Object.assign(property, dto);
    return this.propertyRepo.save(property);
  }

  async remove(id: string, landlord: User): Promise<void> {
    const property = await this.findOne(id, landlord);

    const roomCount = await this.roomRepo.count({
      where: { propertyId: property.id },
    });
    if (roomCount > 0) {
      throw new BadRequestException(
        `Không thể xóa nhà trọ đang có ${roomCount} phòng. Vui lòng xóa hết phòng trước.`,
      );
    }

    await this.propertyRepo.remove(property);
  }
}
