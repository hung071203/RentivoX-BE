import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { Tenant } from './tenant.entity';
import { Property } from './property.entity';
import { VehicleType } from '../../src/common/enums';

@Entity('vehicles')
@Unique(['propertyId', 'plateNumber'])
export class Vehicle extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'plate_number' })
  plateNumber: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
