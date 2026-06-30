import { BaseSeeder } from './base.seeder';
import { AdminSeeder } from './data/001-admin.seeder';
import { DemoDataSeeder } from './data/002-demo-data.seeder';

export const seeders: BaseSeeder[] = [
  new AdminSeeder(),
  new DemoDataSeeder(),
];
