import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@entities/user.entity';
import { Property } from '@entities/property.entity';
import { Room } from '@entities/room.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Property, Room])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class AdminDashboardModule {}
