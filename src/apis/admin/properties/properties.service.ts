import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '@entities/property.entity';
import { Room } from '@entities/room.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { GetAdminPropertiesDto } from './dto/get-admin-properties.dto';

@Injectable()
export class AdminPropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
  ) {}

  async findAll(dto: GetAdminPropertiesDto): Promise<PaginatedResult<any>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.propertyRepo
      .createQueryBuilder('p')
      .leftJoin('p.landlord', 'u')
      .addSelect(['u.id', 'u.fullName', 'u.email']);

    if (dto.search) {
      qb.andWhere(
        '(p.name LIKE :search OR p.address LIKE :search OR p.province LIKE :search OR p.district LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.landlordId) {
      qb.andWhere('p.landlordId = :landlordId', { landlordId: dto.landlordId });
    }

    qb.orderBy(`p.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [properties, total] = await qb.getManyAndCount();

    if (!properties.length) {
      return { items: [], total, page, limit, totalPages: 0 };
    }

    // Batch-query room counts grouped by propertyId + status
    const propertyIds = properties.map((p) => p.id);
    const roomStats = await this.roomRepo
      .createQueryBuilder('r')
      .where('r.propertyId IN (:...propertyIds)', { propertyIds })
      .select('r.propertyId', 'propertyId')
      .addSelect('r.status', 'status')
      .addSelect('COUNT(r.id)', 'count')
      .groupBy('r.propertyId')
      .addGroupBy('r.status')
      .getRawMany();

    // Build map: propertyId → { total, available, occupied, maintenance, reserved }
    const statsMap: Record<string, Record<string, number>> = {};
    for (const row of roomStats) {
      if (!statsMap[row.propertyId]) statsMap[row.propertyId] = {};
      statsMap[row.propertyId][row.status] = Number(row.count);
    }

    const items = properties.map((p) => {
      const s = statsMap[p.id] ?? {};
      const total = Object.values(s).reduce((sum, n) => sum + n, 0);
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        ward: p.ward,
        district: p.district,
        province: p.province,
        createdAt: p.createdAt,
        landlord: p.landlord
          ? {
              id: (p.landlord as any).id,
              fullName: (p.landlord as any).fullName,
              email: (p.landlord as any).email,
            }
          : null,
        rooms: {
          total,
          available: s['available'] ?? 0,
          occupied: s['occupied'] ?? 0,
          maintenance: s['maintenance'] ?? 0,
          reserved: s['reserved'] ?? 0,
        },
      };
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
