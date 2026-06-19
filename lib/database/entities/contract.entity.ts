import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { ContractStatus } from '../../src/common/enums';
import { Room } from './room.entity';
import { Tenant } from './tenant.entity';

@Entity('contracts')
export class Contract extends BaseEntity {
  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'rent_amount', type: 'bigint' })
  rentAmount: number;

  @Column({ name: 'deposit_amount', type: 'bigint' })
  depositAmount: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  status: ContractStatus;

  @Column({ name: 'terminated_date', type: 'date', nullable: true })
  terminatedDate: Date;

  @Column({ name: 'terminated_reason', type: 'text', nullable: true })
  terminatedReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
