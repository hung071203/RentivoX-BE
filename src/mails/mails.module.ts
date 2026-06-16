import { Module } from '@nestjs/common';
import { MailsService } from './mails.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports:[
    MailerModule
  ],
  providers: [MailsService],
  exports: [MailsService],
})
export class MailsModule {}
