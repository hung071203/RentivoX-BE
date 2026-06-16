import { MailTemplates } from '../constants/mail.constant';

export interface SendAccountContext {
  email: string;
  password: string;
}

type BaseMailOptions = {
  to: string;
  from?: string;
  template: MailTemplates;
  context: Record<string, any>;
};

export interface SendPassMailOptions extends BaseMailOptions {
  template: MailTemplates.CREATE_USER | MailTemplates.PASSWORD_RESET;
  context: SendAccountContext;
}

export type MailOptions = SendPassMailOptions;
