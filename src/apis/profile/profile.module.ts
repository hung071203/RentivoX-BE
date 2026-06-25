import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../lib/database/entities/user.entity';
import { Tenant } from '../../../lib/database/entities/tenant.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { OtpModule } from '../../../lib/src/shared-modules/otp.module';
import { WorkersModule } from '../../workers/workers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant]),
    OtpModule,
    WorkersModule,
  ],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}
