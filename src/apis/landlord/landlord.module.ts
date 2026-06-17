import { Module } from '@nestjs/common';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [PropertiesModule, RoomsModule, TenantsModule],
})
export class LandlordModule {}
