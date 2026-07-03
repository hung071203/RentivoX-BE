import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../src/base/base.entity';
import { UserRole, Gender } from '../../src/common/enums';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Chỉ dùng khi role = landlord — dùng để build QR chuyển khoản (VietQR) trên hóa đơn
  @Column({ name: 'bank_bin', type: 'varchar', nullable: true })
  bankBin: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', nullable: true })
  bankAccountNumber: string | null;

  @Column({ name: 'bank_account_holder', type: 'varchar', nullable: true })
  bankAccountHolder: string | null;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string | null;
}
