import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '@entities/property.entity';
import { Room } from '@entities/room.entity';
import { AdminPropertiesController } from './properties.controller';
import { AdminPropertiesService } from './properties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Room])],
  controllers: [AdminPropertiesController],
  providers: [AdminPropertiesService],
  exports: [AdminPropertiesService],
})
export class AdminPropertiesModule {}
