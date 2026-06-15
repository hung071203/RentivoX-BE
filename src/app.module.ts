import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from '../lib/src/configs/env.config';
import { AuthModule } from './apis/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: env.db.host,
      port: env.db.port,
      username: env.db.username,
      password: env.db.password,
      database: env.db.name,
      entities: [__dirname + '/../lib/database/entities/**/*.entity{.ts,.js}'],
      synchronize: env.nodeEnv === 'development',
      logging: env.nodeEnv === 'development',
    }),
    AuthModule,
  ],
})
export class AppModule {}
