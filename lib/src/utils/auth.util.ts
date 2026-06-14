import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DEFAULT_OTP_LENGTH } from '@lib/common/constants/app.constant';

export class AuthUtil {
  /**
   *  Hash a password using bcrypt
   * @param password  pass
   * @param saltRounds  number of salt rounds (default: 10)
   * @returns
   */
  static async hashPassword(password: string, saltRounds: number = 10) {
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with a hash using bcrypt
   * @param password  pass
   * @param hash  hash to compare with
   * @returns
   */
  static async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a random API key (32 characters)
   */
  static generateApiKey(
    prefix: string | undefined,
    length: number = 32,
  ): string {
    const apiKey = randomBytes(length).toString('hex');
    return prefix ? `${prefix}_${apiKey}` : apiKey;
  }

  /**
   * Generate a numeric OTP code (6 digits)
   */
  static generateNumericOtp(length: number = DEFAULT_OTP_LENGTH): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Generate a random Password (8-20 characters, must include uppercase, lowercase, number and special character)
   */
  static generateRandomPassword(length: number = 12): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }
}
