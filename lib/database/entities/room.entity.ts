import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { RoomType, RoomStatus } from '../../src/common/enums';
import { Property } from './property.entity';

@Entity('rooms')
export class Room extends BaseEntity {
  @Column({ name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'room_number' })
  roomNumber: string;

  @Column({ nullable: true })
  floor: number;

  @Column({ name: 'room_type', type: 'enum', enum: RoomType })
  roomType: RoomType;

  @Column({ name: 'area_m2', type: 'decimal', precision: 6, scale: 2, nullable: true })
  areaM2: number;

  @Column({ name: 'base_price', type: 'bigint' })
  basePrice: number;

  @Column({ name: 'max_occupants', nullable: true })
  maxOccupants: number;

  @Column({ name: 'has_private_wc', default: false })
  hasPrivateWc: boolean;

  @Column({ name: 'has_kitchen', default: false })
  hasKitchen: boolean;

  @Column({ name: 'has_ac', default: false })
  hasAc: boolean;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.AVAILABLE })
  status: RoomStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Computed — not a DB column, populated by service queries
  occupantCount?: number;
}
