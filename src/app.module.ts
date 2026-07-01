import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ENV } from '../lib/src/configs/env.config';
import { AuthModule } from './apis/auth/auth.module';
import { AdminModule } from './apis/admin/admin.module';
import { ProfileModule } from './apis/profile/profile.module';
import { LandlordModule } from './apis/landlord/landlord.module';
import { TenantModule } from './apis/tenant/tenant.module';
import { CronsModule } from './crons/crons.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import path, { join } from 'path';
import { MailsModule } from './mails/mails.module';
import { WorkersModule } from './workers/workers.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './apis/chat/chat.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import {
  BULLMQ_PREFIX,
  defaultBullmqJobOptions,
} from '@lib/common/constants/bullmq.constant';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    MailerModule.forRoot({
      transport: {
        host: ENV.mail.host,
        port: ENV.mail.port,
        secure: ENV.mail.port == 465, // true for 465, false for other ports
        auth: {
          user: ENV.mail.user,
          pass: ENV.mail.pass,
        },
      },
      defaults: {
        from: ENV.mail.from,
      },
      template: {
        dir: path.join(process.cwd(), 'src', 'mails', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    BullModule.forRoot({
      connection: {
        host: ENV.redis.host,
        port: ENV.redis.port,
        password: ENV.redis.password,
      },
      prefix: `${ENV.nodeEnv}:${BULLMQ_PREFIX}`,
      defaultJobOptions: defaultBullmqJobOptions,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),
    UploadsModule,
    NotificationsModule,
    ChatModule,
    AuthModule,
    AdminModule,
    ProfileModule,
    LandlordModule,
    TenantModule,
    CronsModule,
    MailsModule,
    WorkersModule,
  ],
})
export class AppModule {}
