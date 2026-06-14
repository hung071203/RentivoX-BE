import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ContractService } from './contract-service.entity';
import { User } from './user.entity';

@Entity('meter_readings')
export class MeterReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_service_id' })
  contractServiceId: string;

  @ManyToOne(() => ContractService)
  @JoinColumn({ name: 'contract_service_id' })
  contractService: ContractService;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
