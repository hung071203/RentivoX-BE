import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { PaymentMethod, PaymentSource } from '../../src/common/enums';
import { Invoice } from './invoice.entity';
import { User } from './user.entity';

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentSource,
    default: PaymentSource.MANUAL,
  })
  source: PaymentSource;

  @Column({ name: 'reference_code', nullable: true })
  referenceCode: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'recorded_by' })
  recordedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recorded_by' })
  recordedBy: User;
}
