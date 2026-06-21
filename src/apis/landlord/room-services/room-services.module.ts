import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Room } from '@entities/room.entity';
import { Service } from '@entities/service.entity';
import { Contract } from '@entities/contract.entity';
import { RoomServicesController } from './room-services.controller';
import { RoomServicesService } from './room-services.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomServiceEntity, Room, Service, Contract])],
  controllers: [RoomServicesController],
  providers: [RoomServicesService],
  exports: [RoomServicesService],
})
export class RoomServicesModule {}
