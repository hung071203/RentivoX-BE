import { DataSource } from 'typeorm';
import { SeederVersion } from '../entities/seeder-version.entity';
import { seeders } from './index';
import { ENV } from '@lib/configs/env.config';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: ENV.db.host,
  port: ENV.db.port,
  username: ENV.db.username,
  password: ENV.db.password,
  database: ENV.db.name,
  entities: [__dirname + '/../entities/**/*.entity{.ts,.js}'],
  synchronize: true,
});

async function run() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const versionRepo = AppDataSource.getRepository(SeederVersion);

  const executed = await versionRepo.find();
  const executedNames = new Set(executed.map((v) => v.name));

  const pending = seeders.filter((s) => !executedNames.has(s.name));

  if (pending.length === 0) {
    console.log('Nothing to seed.');
  } else {
    for (const seeder of pending) {
      console.log(`Running seeder: ${seeder.name}`);
      await seeder.run(AppDataSource);
      await versionRepo.save({ name: seeder.name });
      console.log(`✓ Done: ${seeder.name}`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seeding complete.');
}

run().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
