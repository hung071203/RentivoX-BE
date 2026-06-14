import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { InvoiceStatus } from '../../src/common/enums';
import { Contract } from './contract.entity';

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'date' })
  period: Date;

  @Column({ name: 'total_amount', type: 'bigint' })
  totalAmount: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
