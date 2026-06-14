import { Column, Entity, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { User } from './user.entity';

@Entity('properties')
export class Property extends BaseEntity {
  @Column({ name: 'landlord_id' })
  landlordId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'landlord_id' })
  landlord: User;

  @Column()
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ nullable: true })
  ward: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  province: string;
}
