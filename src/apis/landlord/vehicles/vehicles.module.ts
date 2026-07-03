import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '@entities/vehicle.entity';
import { Property } from '@entities/property.entity';
import { Tenant } from '@entities/tenant.entity';
import { UploadsModule } from '../../../uploads/uploads.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Property, Tenant]),
    UploadsModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
