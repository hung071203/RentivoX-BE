import { MAIL_SUBJECTS } from '@lib/common/constants/mail.constant';
import { MailOptions } from '@lib/common/interfaces/mail.interface';
import { ENV } from '@lib/configs/env.config';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailsService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Send email
   * @param data MailOptions with template, and context
   */
  async sendMail(data: MailOptions) {
    try {
      const subject = MAIL_SUBJECTS[data.template] || 'Thông báo từ RentivoX';
      await this.mailerService.sendMail({
        to: data.to,
        from: data.from ?? ENV.mail.from,
        subject,
        template: data.template,
        context: {
          ...data.context,
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
