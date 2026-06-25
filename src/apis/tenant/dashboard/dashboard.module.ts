import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '@entities/contract.entity';
import { Invoice } from '@entities/invoice.entity';
import { Payment } from '@entities/payment.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, Invoice, Payment, RoomOccupant, Tenant]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class TenantDashboardModule {}
