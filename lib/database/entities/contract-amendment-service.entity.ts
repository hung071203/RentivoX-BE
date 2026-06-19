import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { ContractAmendment } from './contract-amendment.entity';
import { ContractService } from './contract-service.entity';

@Entity('contract_amendment_services')
export class ContractAmendmentService extends BaseEntity {
  @Column({ name: 'amendment_id' })
  amendmentId: string;

  @ManyToOne(() => ContractAmendment)
  @JoinColumn({ name: 'amendment_id' })
  amendment: ContractAmendment;

  @Column({ name: 'contract_service_id' })
  contractServiceId: string;

  @ManyToOne(() => ContractService)
  @JoinColumn({ name: 'contract_service_id' })
  contractService: ContractService;

  @Column({ name: 'new_unit_price', type: 'bigint' })
  newUnitPrice: number;
}
