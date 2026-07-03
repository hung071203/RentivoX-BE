import { Module } from '@nestjs/common';
import { TenantDashboardModule } from './dashboard/dashboard.module';
import { TenantContractsModule } from './contracts/contracts.module';
import { TenantInvoicesModule } from './invoices/invoices.module';
import { TenantPaymentsModule } from './payments/payments.module';
import { TenantRoomModule } from './room/room.module';
import { TenantVehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    TenantDashboardModule,
    TenantRoomModule,
    TenantContractsModule,
    TenantInvoicesModule,
    TenantPaymentsModule,
    TenantVehiclesModule,
  ],
})
export class TenantModule {}
