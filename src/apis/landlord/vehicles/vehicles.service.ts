import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '@entities/vehicle.entity';
import { Property } from '@entities/property.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { VehicleType } from '@lib/common/enums';
import {
  VN_PLATE_REGEX,
  normalizePlateNumber,
} from '@lib/common/constants/vehicle.constant';
import { UploadsService } from '../../../uploads/uploads.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { GetVehiclesDto } from './dto/get-vehicles.dto';

// Chỉ xe máy/ô tô có biển số chính thức do nhà nước cấp — xe đạp/khác không validate format
const HAS_OFFICIAL_PLATE = [VehicleType.MOTORBIKE, VehicleType.CAR];

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,

    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,

    private readonly uploadsService: UploadsService,
  ) {}

  async findAll(
    dto: GetVehiclesDto,
    landlord: User,
  ): Promise<PaginatedResult<Vehicle>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.vehicleRepo
      .createQueryBuilder('vehicle')
      .innerJoin('vehicle.property', 'property')
      .addSelect(['property.id', 'property.name'])
      .innerJoin('vehicle.tenant', 'tenant')
      .addSelect(['tenant.id', 'tenant.fullName', 'tenant.phone'])
      .where('property.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.propertyId) {
      qb.andWhere('vehicle.propertyId = :propertyId', {
        propertyId: dto.propertyId,
      });
    }
    if (dto.tenantId) {
      qb.andWhere('vehicle.tenantId = :tenantId', { tenantId: dto.tenantId });
    }
    if (dto.search) {
      qb.andWhere('vehicle.plateNumber LIKE :search', {
        search: `%${normalizePlateNumber(dto.search)}%`,
      });
    }

    qb.orderBy(`vehicle.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, landlord: User): Promise<Vehicle> {
    const vehicle = await this.loadForLandlord(id, landlord);
    return vehicle;
  }

  async create(
    dto: CreateVehicleDto,
    file: Express.Multer.File,
    landlord: User,
  ): Promise<Vehicle> {
    try {
      const property = await this.propertyRepo.findOne({
        where: { id: dto.propertyId },
      });
      if (!property || property.landlordId !== landlord.id)
        throw new NotFoundException('Không tìm thấy nhà trọ');

      const tenant = await this.tenantRepo.findOne({
        where: { id: dto.tenantId },
      });
      if (!tenant || tenant.landlordId !== landlord.id)
        throw new NotFoundException('Không tìm thấy khách thuê');

      this.assertValidPlateFormat(dto.plateNumber, dto.vehicleType);

      const existing = await this.vehicleRepo.findOne({
        where: { propertyId: dto.propertyId, plateNumber: dto.plateNumber },
      });
      if (existing)
        throw new ConflictException(
          `Biển số "${dto.plateNumber}" đã tồn tại trong nhà trọ này`,
        );

      const vehicle = this.vehicleRepo.create({
        ...dto,
        imageUrl: this.uploadsService.getFileUrl('vehicles', file.filename),
      });
      return await this.vehicleRepo.save(vehicle);
    } catch (error) {
      await this.uploadsService.deleteFile(
        this.uploadsService.getFileUrl('vehicles', file.filename),
      );
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    landlord: User,
    file?: Express.Multer.File,
  ): Promise<Vehicle> {
    const vehicle = await this.loadForLandlord(id, landlord);
    const oldImageUrl = vehicle.imageUrl;

    try {
      const nextPropertyId = dto.propertyId ?? vehicle.propertyId;
      if (dto.propertyId && dto.propertyId !== vehicle.propertyId) {
        const property = await this.propertyRepo.findOne({
          where: { id: dto.propertyId },
        });
        if (!property || property.landlordId !== landlord.id)
          throw new NotFoundException('Không tìm thấy nhà trọ');
      }

      if (dto.tenantId && dto.tenantId !== vehicle.tenantId) {
        const tenant = await this.tenantRepo.findOne({
          where: { id: dto.tenantId },
        });
        if (!tenant || tenant.landlordId !== landlord.id)
          throw new NotFoundException('Không tìm thấy khách thuê');
      }

      const nextPlateNumber = dto.plateNumber ?? vehicle.plateNumber;
      const nextVehicleType = dto.vehicleType ?? vehicle.vehicleType;
      this.assertValidPlateFormat(nextPlateNumber, nextVehicleType);

      if (
        nextPropertyId !== vehicle.propertyId ||
        nextPlateNumber !== vehicle.plateNumber
      ) {
        const existing = await this.vehicleRepo.findOne({
          where: { propertyId: nextPropertyId, plateNumber: nextPlateNumber },
        });
        if (existing && existing.id !== id)
          throw new ConflictException(
            `Biển số "${nextPlateNumber}" đã tồn tại trong nhà trọ này`,
          );
      }

      Object.assign(vehicle, dto);
      if (file) {
        vehicle.imageUrl = this.uploadsService.getFileUrl(
          'vehicles',
          file.filename,
        );
      }
      const saved = await this.vehicleRepo.save(vehicle);

      if (file && oldImageUrl) {
        await this.uploadsService.deleteFile(oldImageUrl);
      }
      return saved;
    } catch (error) {
      if (file)
        await this.uploadsService.deleteFile(
          this.uploadsService.getFileUrl('vehicles', file.filename),
        );
      throw error;
    }
  }

  async remove(id: string, landlord: User): Promise<void> {
    const vehicle = await this.loadForLandlord(id, landlord);
    await this.vehicleRepo.remove(vehicle);
    await this.uploadsService.deleteFile(vehicle.imageUrl);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private assertValidPlateFormat(
    plateNumber: string,
    vehicleType: VehicleType,
  ): void {
    if (!HAS_OFFICIAL_PLATE.includes(vehicleType)) return;
    if (!VN_PLATE_REGEX.test(plateNumber)) {
      throw new BadRequestException(
        'Biển số không đúng định dạng xe máy/ô tô Việt Nam (VD: 30A12345)',
      );
    }
  }

  private async loadForLandlord(id: string, landlord: User): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo
      .createQueryBuilder('vehicle')
      .innerJoin('vehicle.property', 'property')
      .addSelect(['property.id', 'property.landlordId', 'property.name'])
      .innerJoin('vehicle.tenant', 'tenant')
      .addSelect(['tenant.id', 'tenant.fullName', 'tenant.phone'])
      .where('vehicle.id = :id', { id })
      .getOne();

    if (!vehicle) throw new NotFoundException('Không tìm thấy phương tiện');
    if (vehicle.property.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập phương tiện này');

    return vehicle;
  }
}
