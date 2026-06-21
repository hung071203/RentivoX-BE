import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BullmqQueuesEnum } from '@lib/common/constants/bullmq.constant';
import { Contract } from '@entities/contract.entity';
import { ContractDocument } from '@entities/contract-document.entity';
import { ContractAmendment } from '@entities/contract-amendment.entity';
import { ContractAmendmentService as ContractAmendmentServiceEntity } from '@entities/contract-amendment-service.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Room } from '@entities/room.entity';
import { Tenant } from '@entities/tenant.entity';
import { RoomService as RoomServiceEntity } from '@entities/room-service.entity';
import { Invoice } from '@entities/invoice.entity';
import { UploadsModule } from '../../../uploads/uploads.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      ContractDocument,
      ContractAmendment,
      ContractAmendmentServiceEntity,
      ContractServiceEntity,
      RoomOccupant,
      Room,
      Tenant,
      RoomServiceEntity,
      Invoice,
    ]),
    UploadsModule,
    BullModule.registerQueue({ name: BullmqQueuesEnum.CONTRACT }),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
