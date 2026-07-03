import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '@entities/vehicle.entity';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { OrderDirection } from '@lib/common/dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async findMine(user: User): Promise<Vehicle[]> {
    const tenant = await this.tenantRepo.findOne({
      where: { userId: user.id },
    });
    if (!tenant)
      throw new NotFoundException('Không tìm thấy thông tin khách thuê');

    return this.vehicleRepo.find({
      where: { tenantId: tenant.id },
      relations: { property: true },
      order: { createdAt: OrderDirection.ASC },
    });
  }
}
