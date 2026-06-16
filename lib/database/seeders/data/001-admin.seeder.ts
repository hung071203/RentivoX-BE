import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../../src/common/enums';
import { BaseSeeder } from '../base.seeder';
import { ENV } from '@lib/configs/env.config';
import { AuthUtil } from '@lib/utils/auth.util';

export class AdminSeeder extends BaseSeeder {
  name = '001-admin';

  async run(dataSource: DataSource) {
    const userRepo = dataSource.getRepository(User);

    const exists = await userRepo.findOne({ where: { email: ENV.admin.email } });
    if (exists) return;

    const passwordHash = await AuthUtil.hashPassword(ENV.admin.password);

    await userRepo.save({
      email: ENV.admin.email,
      passwordHash,
      fullName: 'System Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    });
  }
}
