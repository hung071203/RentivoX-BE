import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { Room } from './room.entity';
import { Service } from './service.entity';

@Entity('room_services')
@Unique(['roomId', 'serviceId'])
export class RoomService extends BaseEntity {
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

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: number;
}
