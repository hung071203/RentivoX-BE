import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '@entities/contract.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Tenant } from '@entities/tenant.entity';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, RoomOccupant, RoomServiceEntity, Tenant]),
  ],
  controllers: [RoomController],
  providers: [RoomService],
})
export class TenantRoomModule {}
