import { Module } from '@nestjs/common';
import { GeminiService } from '../services/gemini.service';
import { ToolAIService } from '../services/tool-ai.service';

@Module({
  providers: [GeminiService, ToolAIService],
  exports: [GeminiService, ToolAIService],
})
export class GeminiModule {}
