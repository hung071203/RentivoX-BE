import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '@entities/service.entity';
import { Property } from '@entities/property.entity';
import { ContractService } from '@entities/contract-service.entity';
import { LandlordServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Property, ContractService])],
  controllers: [LandlordServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class LandlordServicesModule {}
