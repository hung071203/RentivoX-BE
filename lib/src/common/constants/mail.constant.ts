export enum MailTemplates {
  CREATE_USER = 'create-user',
  PASSWORD_RESET = 'password-reset',
  OTP = 'otp',
}

export const MAIL_SUBJECTS = {
  [MailTemplates.CREATE_USER]: 'Chào mừng bạn đến với RentivoX',
  [MailTemplates.PASSWORD_RESET]: 'Cấp lại mật khẩu RentivoX',
  [MailTemplates.OTP]: 'Mã xác thực OTP - RentivoX',
} as const;
