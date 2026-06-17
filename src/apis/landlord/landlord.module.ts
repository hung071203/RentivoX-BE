import { Module } from '@nestjs/common';
import { PropertiesModule } from './properties/properties.module';

@Module({
  imports: [PropertiesModule],
})
export class LandlordModule {}
