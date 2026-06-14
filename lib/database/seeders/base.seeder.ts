import { DataSource } from 'typeorm';

export abstract class BaseSeeder {
  abstract name: string;
  abstract run(dataSource: DataSource): Promise<void>;
}
