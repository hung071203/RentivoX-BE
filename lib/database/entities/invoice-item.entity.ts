import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { ContractService } from './contract-service.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column()
  description: string;

  @Column({ name: 'contract_service_id', nullable: true })
  contractServiceId: string;

  @ManyToOne(() => ContractService, { nullable: true })
  @JoinColumn({ name: 'contract_service_id' })
  contractService: ContractService;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: number;

  @Column({ type: 'bigint' })
  amount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
