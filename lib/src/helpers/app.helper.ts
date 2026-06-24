import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export const createLogger = (context: string) => new Logger(context);

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomPart = randomUUID().split('-')[0].toUpperCase(); // Get the first part of UUID and convert to uppercase
  return `HD-${year}${month}-${randomPart}`;
}
