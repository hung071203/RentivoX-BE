import { IsIn, IsString, MaxLength } from 'class-validator';
import { Trim } from '@lib/decorators';

export class BroadcastNotificationDto {
  @IsString()
  @MaxLength(255)
  @Trim()
  title: string;

  @IsString()
  @MaxLength(5000)
  @Trim()
  message: string;

  @IsIn(['all', 'landlord', 'tenant'])
  target: 'all' | 'landlord' | 'tenant';
}
