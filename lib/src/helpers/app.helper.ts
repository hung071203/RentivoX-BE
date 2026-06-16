import { Logger } from '@nestjs/common';

export const createLogger = (context: string) => new Logger(context);
