import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WorkersModule } from '../../../workers/workers.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), WorkersModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class AdminUsersModule {}
