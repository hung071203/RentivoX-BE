import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Contract } from './contract.entity';

@Entity('room_occupants')
export class RoomOccupant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id' })
  contractId: string;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'id_card_number', nullable: true })
  idCardNumber: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'moved_in_date', type: 'date' })
  movedInDate: Date;

  @Column({ name: 'moved_out_date', type: 'date', nullable: true })
  movedOutDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
