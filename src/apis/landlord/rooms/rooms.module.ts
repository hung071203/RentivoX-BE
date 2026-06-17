import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '@entities/room.entity';
import { Property } from '@entities/property.entity';
import { Contract } from '@entities/contract.entity';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Property, Contract])],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
