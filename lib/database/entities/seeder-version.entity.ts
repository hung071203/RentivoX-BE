import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';

@Entity('seeder_versions')
export class SeederVersion extends BaseEntity {
  @Column({ unique: true })
  name: string;
}
