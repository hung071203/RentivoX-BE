import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterReading } from '@entities/meter-reading.entity';
import { Room } from '@entities/room.entity';
import { Property } from '@entities/property.entity';
import { Service } from '@entities/service.entity';
import { ContractService } from '@entities/contract-service.entity';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Invoice } from '@entities/invoice.entity';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';

@Module({
  imports: [TypeOrmModule.forFeature([MeterReading, Room, Property, Service, ContractService, RoomServiceEntity, Invoice])],
  controllers: [MeterReadingsController],
  providers: [MeterReadingsService],
  exports: [MeterReadingsService],
})
export class MeterReadingsModule {}
