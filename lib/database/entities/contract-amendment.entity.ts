import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { AmendmentType } from '../../src/common/enums';
import { Contract } from './contract.entity';
import { ContractDocument } from './contract-document.entity';

@Entity('contract_amendments')
export class ContractAmendment extends BaseEntity {
  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => ContractDocument)
  @JoinColumn({ name: 'document_id' })
  document: ContractDocument;

  @Column({ name: 'amendment_type', type: 'enum', enum: AmendmentType })
  amendmentType: AmendmentType;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: Date;

  @Column({ name: 'is_applied', type: 'boolean', default: false })
  isApplied: boolean;

  @Column({ name: 'new_rent_amount', type: 'bigint', nullable: true })
  newRentAmount: number;

  @Column({ name: 'new_end_date', type: 'date', nullable: true })
  newEndDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
