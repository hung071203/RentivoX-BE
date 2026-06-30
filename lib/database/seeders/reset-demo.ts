/**
 * Xóa toàn bộ demo data (002-demo-data) theo đúng thứ tự FK.
 * Giữ nguyên super_admin và seeder version 001-admin.
 *
 * Sử dụng: pnpm seed:reset
 * Sau đó chạy: pnpm seed   để seed lại
 */
import { DataSource } from 'typeorm';
import { ENV } from '@lib/configs/env.config';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: ENV.db.host,
  port: ENV.db.port,
  username: ENV.db.username,
  password: ENV.db.password,
  database: ENV.db.name,
  entities: [__dirname + '/../entities/**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function resetDemo() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    await qr.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'contract_amendment_services',
      'contract_amendments',
      'invoice_items',
      'payments',
      'invoices',
      'meter_readings',
      'room_occupants',
      'contract_services',
      'contract_documents',
      'contracts',
      'room_services',
      'services',
      'rooms',
      'notifications',
      'tenants',
      'properties',
    ];

    for (const table of tables) {
      await qr.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`  Truncated: ${table}`);
    }

    // Xóa users không phải super_admin
    await qr.query(`DELETE FROM \`users\` WHERE role != 'super_admin'`);
    console.log('  Deleted: non-super_admin users');

    // Xóa seeder version để có thể chạy lại
    await qr.query(`DELETE FROM \`seeder_versions\` WHERE name = '002-demo-data'`);
    console.log('  Deleted: seeder version 002-demo-data');

    await qr.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✓ Reset complete. Chạy `pnpm seed` để seed lại.');
  } catch (err) {
    await qr.query('SET FOREIGN_KEY_CHECKS = 1');
    throw err;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

resetDemo().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
