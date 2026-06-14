import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { User } from './user.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'landlord_id' })
  landlordId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'landlord_id' })
  landlord: User;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'id_card_number', nullable: true })
  idCardNumber: string;

  @Column({ name: 'id_card_issued_date', type: 'date', nullable: true })
  idCardIssuedDate: Date;

  @Column({ name: 'id_card_issued_place', nullable: true })
  idCardIssuedPlace: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ name: 'permanent_address', type: 'text', nullable: true })
  permanentAddress: string;
}
