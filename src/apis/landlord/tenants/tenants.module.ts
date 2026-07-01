import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { GeminiModule } from '@lib/shared-modules/gemini.module';
import { WorkersModule } from '../../../workers/workers.module';
import { UploadsModule } from '../../../uploads/uploads.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, RoomOccupant]),
    WorkersModule,
    UploadsModule,
    GeminiModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
