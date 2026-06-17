import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '@entities/service.entity';
import { Property } from '@entities/property.entity';
import { ContractService } from '@entities/contract-service.entity';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesDto } from './dto/get-services.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,

    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,

    @InjectRepository(ContractService)
    private readonly contractServiceRepo: Repository<ContractService>,
  ) {}

  async findAll(dto: GetServicesDto, landlord: User): Promise<PaginatedResult<Service>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.serviceRepo
      .createQueryBuilder('service')
      .innerJoin('service.property', 'property')
      .addSelect(['property.id', 'property.name'])
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.propertyId) {
      qb.andWhere('service.propertyId = :propertyId', { propertyId: dto.propertyId });
    }
    if (dto.type) {
      qb.andWhere('service.type = :type', { type: dto.type });
    }
    if (dto.isActive !== undefined) {
      qb.andWhere('service.isActive = :isActive', { isActive: dto.isActive });
    }

    qb.orderBy(`service.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, landlord: User): Promise<Service> {
    const service = await this.serviceRepo.findOne({
      where: { id },
      relations: { property: true },
    });
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
    if (service.property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập');
    return service;
  }

  async create(dto: CreateServiceDto, landlord: User): Promise<Service> {
    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
    if (!property) throw new NotFoundException('Không tìm thấy nhà trọ');
    if (property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập');

    const service = this.serviceRepo.create(dto);
    return this.serviceRepo.save(service);
  }

  async update(id: string, dto: UpdateServiceDto, landlord: User): Promise<Service> {
    const service = await this.findOne(id, landlord);
    Object.assign(service, dto);
    return this.serviceRepo.save(service);
  }

  async remove(id: string, landlord: User): Promise<void> {
    const service = await this.findOne(id, landlord);

    const usageCount = await this.contractServiceRepo.count({
      where: { serviceId: id },
    });
    if (usageCount > 0)
      throw new BadRequestException(
        'Không thể xóa dịch vụ đang được sử dụng trong hợp đồng',
      );

    await this.serviceRepo.remove(service);
  }
}
