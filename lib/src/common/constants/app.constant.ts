export const RegexPatterns = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/,
};

export const DEFAULT_OTP_LENGTH = 6;

export enum DateFormatEnum {
  YYYY_MM_DD = 'YYYY-MM-DD',
  YYYY_MM_DD_HH_MM_SS = 'YYYY-MM-DD HH:mm:ss',
  ISO = 'YYYY-MM-DDTHH:mm:ssZ',
  YYYY_MM = 'YYYY-MM',
}