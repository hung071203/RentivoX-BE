import { Module } from '@nestjs/common';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { TenantsModule } from './tenants/tenants.module';
import { LandlordServicesModule } from './services/services.module';
import { ContractsModule } from './contracts/contracts.module';

@Module({
  imports: [PropertiesModule, RoomsModule, TenantsModule, LandlordServicesModule, ContractsModule],
})
export class LandlordModule {}
