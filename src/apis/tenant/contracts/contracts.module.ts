import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '@entities/contract.entity';
import { ContractDocument } from '@entities/contract-document.entity';
import { ContractAmendment } from '@entities/contract-amendment.entity';
import { ContractService as ContractServiceEntity } from '@entities/contract-service.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Tenant } from '@entities/tenant.entity';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contract,
      ContractDocument,
      ContractAmendment,
      ContractServiceEntity,
      RoomOccupant,
      Tenant,
    ]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class TenantContractsModule {}
