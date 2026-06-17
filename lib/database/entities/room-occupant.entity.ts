import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { Contract } from './contract.entity';
import { Tenant } from './tenant.entity';

@Entity('room_occupants')
export class RoomOccupant extends BaseEntity {
  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'is_owner', default: false })
  isOwner: boolean;

  @Column({ name: 'moved_in_date', type: 'date' })
  movedInDate: Date;

  @Column({ name: 'moved_out_date', type: 'date', nullable: true })
  movedOutDate: Date;
}
