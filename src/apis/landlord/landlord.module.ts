import { Module } from '@nestjs/common';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [PropertiesModule, RoomsModule],
})
export class LandlordModule {}
