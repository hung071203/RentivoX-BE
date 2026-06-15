import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENV } from '../lib/src/configs/env.config';
import { AuthModule } from './apis/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: ENV.db.host,
      port: ENV.db.port,
      username: ENV.db.username,
      password: ENV.db.password,
      database: ENV.db.name,
      entities: [__dirname + '/../lib/database/entities/**/*.entity{.ts,.js}'],
      synchronize: ENV.nodeEnv === 'development',
      logging: ENV.nodeEnv === 'development',
    }),
    AuthModule,
  ],
})
export class AppModule {}
