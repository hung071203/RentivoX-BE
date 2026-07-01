import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { GeminiModule } from '@lib/shared-modules/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ChatController],
})
export class ChatModule {}
