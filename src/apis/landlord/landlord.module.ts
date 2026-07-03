import { Module } from '@nestjs/common';
import { LandlordDashboardModule } from './dashboard/dashboard.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { RoomServicesModule } from './room-services/room-services.module';
import { TenantsModule } from './tenants/tenants.module';
import { LandlordServicesModule } from './services/services.module';
import { ContractsModule } from './contracts/contracts.module';
import { MeterReadingsModule } from './meter-readings/meter-readings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    LandlordDashboardModule,
    PropertiesModule,
    RoomsModule,
    RoomServicesModule,
    TenantsModule,
    LandlordServicesModule,
    ContractsModule,
    MeterReadingsModule,
    InvoicesModule,
    PaymentsModule,
    VehiclesModule,
  ],
})
export class LandlordModule {}
