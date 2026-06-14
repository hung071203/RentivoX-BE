import { BaseSeeder } from './base.seeder';
import { AdminSeeder } from './data/001-admin.seeder';

export const seeders: BaseSeeder[] = [
  new AdminSeeder(),
];
