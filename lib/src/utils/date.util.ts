import { DateFormatEnum } from '../common';
import { dayjs } from './dayjs.util';

export class DateUtils {
  static getCurrentDateInTimezone(timezone: string): Date {
    return dayjs().tz(timezone).toDate();
  }

  static getFormatDateInTimezone(
    date: Date,
    timezone: string,
    format: DateFormatEnum,
  ): string {
    return dayjs(date).tz(timezone).format(format);
  }

  static getCurrentMonthKey(timezone: string): string {
    return dayjs().tz(timezone).format(DateFormatEnum.YYYY_MM);
  }

  static getTenMinBucket(date: Date = new Date()): Date {
    return new Date(Math.floor(date.getTime() / 600_000) * 600_000);
  }
}
