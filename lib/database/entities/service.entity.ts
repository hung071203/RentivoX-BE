import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { ServiceType } from '../../src/common/enums';
import { Property } from './property.entity';

@Entity('services')
export class Service extends BaseEntity {
  @Column({ name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ServiceType })
  type: ServiceType;

  @Column({ nullable: true })
  unit: string;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
