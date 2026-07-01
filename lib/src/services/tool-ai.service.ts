import { DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ToolAIService {
  private readonly logger = new Logger(ToolAIService.name);

  async handleFunctionCall(functionName: string, args: Record<string, any>) {
    switch (functionName) {
      case this.getCurrentDate.name: {
        return this.getCurrentDate(args.timezone);
      }

      default:
        throw new Error(`Unknown function call: ${functionName}`);
    }
  }

  getCurrentDate(timezone = DEFAULT_TIMEZONE): string {
    return DateUtils.getCurrentDateInTimezone(timezone).toISOString();
  }
}
