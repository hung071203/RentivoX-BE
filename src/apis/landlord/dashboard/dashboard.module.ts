import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '@entities/room.entity';
import { Contract } from '@entities/contract.entity';
import { Invoice } from '@entities/invoice.entity';
import { Payment } from '@entities/payment.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Contract, Invoice, Payment])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class LandlordDashboardModule {}
