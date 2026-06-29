export enum MailTemplates {
  CREATE_USER = 'create-user',
  PASSWORD_RESET = 'password-reset',
  OTP = 'otp',
  INVOICE_CREATED = 'invoice-created',
}

export const MAIL_SUBJECTS = {
  [MailTemplates.CREATE_USER]: 'Chào mừng bạn đến với RentivoX',
  [MailTemplates.PASSWORD_RESET]: 'Cấp lại mật khẩu RentivoX',
  [MailTemplates.OTP]: 'Mã xác thực OTP - RentivoX',
  [MailTemplates.INVOICE_CREATED]: 'Hóa đơn tiền phòng mới - RentivoX',
} as const;
