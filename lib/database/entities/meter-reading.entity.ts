import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { Room } from './room.entity';
import { Service } from './service.entity';
import { User } from './user.entity';

@Entity('meter_readings')
export class MeterReading extends BaseEntity {
  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'service_id' })
  serviceId: string;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ type: 'date' })
  period: Date;

  @Column({ name: 'value_start', type: 'decimal', precision: 10, scale: 2 })
  valueStart: number;

  @Column({ name: 'value_end', type: 'decimal', precision: 10, scale: 2 })
  valueEnd: number;

  @Column({ name: 'recorded_at', type: 'timestamp', nullable: true })
  recordedAt: Date;

  @Column({ name: 'recorded_by' })
  recordedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recorded_by' })
  recordedBy: User;
}
