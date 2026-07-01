import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Trim } from '@lib/decorators';

export class ChatDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsOptional()
  previousInteractionId?: string;
}
