import { NotificationType } from '@lib/common/enums';

export class CreateNotificationDto {
  userId: string;
  senderId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, string> | null;
}
