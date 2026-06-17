import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AuthUtil } from '../utils/auth.util';

export enum OtpContext {
  FORGOT_PASSWORD = 'fp',
  CHANGE_EMAIL = 'ce',
}

interface OtpData {
  otp: string;
  expiresAt: number;
  lastSentAt: number;
  extra?: Record<string, string>;
}

interface DailyData {
  count: number;
  date: string; // YYYY-MM-DD
}

const OTP_TTL_MS = 10 * 60 * 1_000;      // 10 phút
const OTP_COOLDOWN_MS = 60 * 1_000;       // 1 phút
const OTP_DAILY_LIMIT = 5;

@Injectable()
export class OtpService {
  private readonly otpStore = new Map<string, OtpData>();
  private readonly dailyStore = new Map<string, DailyData>();

  private key(ctx: OtpContext, userId: string): string {
    return `${ctx}:${userId}`;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async request(
    ctx: OtpContext,
    userId: string,
    extra?: Record<string, string>,
  ): Promise<string> {
    const key = this.key(ctx, userId);
    const now = Date.now();

    // Kiểm tra cooldown 1 phút
    const current = this.otpStore.get(key);
    if (current && now - current.lastSentAt < OTP_COOLDOWN_MS) {
      const remaining = Math.ceil((OTP_COOLDOWN_MS - (now - current.lastSentAt)) / 1_000);
      throw new HttpException(
        `Vui lòng đợi ${remaining} giây trước khi gửi lại.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Kiểm tra giới hạn 5 lần/ngày
    const today = this.today();
    const daily = this.dailyStore.get(key);
    const dailyCount = daily?.date === today ? daily.count : 0;
    if (dailyCount >= OTP_DAILY_LIMIT) {
      throw new HttpException(
        'Bạn đã đạt giới hạn gửi OTP trong ngày (5 lần). Vui lòng thử lại vào ngày mai.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = AuthUtil.generateNumericOtp();

    this.otpStore.set(key, {
      otp,
      expiresAt: now + OTP_TTL_MS,
      lastSentAt: now,
      extra,
    });

    this.dailyStore.set(key, { count: dailyCount + 1, date: today });

    return otp;
  }

  async verify(
    ctx: OtpContext,
    userId: string,
    code: string,
  ): Promise<Record<string, string>> {
    const key = this.key(ctx, userId);
    const entry = this.otpStore.get(key);
    const now = Date.now();

    if (!entry || now > entry.expiresAt) {
      this.otpStore.delete(key);
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    if (entry.otp !== code) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    this.otpStore.delete(key);
    return entry.extra ?? {};
  }
}
