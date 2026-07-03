import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { Invoice } from './invoice.entity';
import { Tenant } from './tenant.entity';

@Entity('payment_proofs')
export class PaymentProof extends BaseEntity {
  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'proof_image_url' })
  proofImageUrl: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
