import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@lib/guards';
import { CurrentUser } from '@lib/decorators';
import { User } from '@entities/user.entity';
import { GeminiService } from '@lib/services/gemini.service';
import { ToolAIService } from '@lib/services/tool-ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly toolAIService: ToolAIService,
  ) {}

  @Post()
  async chat(
    @Body() dto: ChatDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const result = await this.geminiService.chat(
        {
          input: dto.input,
          previous_interaction_id: dto.previousInteractionId,
        },
        user,
        (text: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
        },
        this.toolAIService,
      );

      res.write(
        `data: ${JSON.stringify({ type: 'done', interactionId: result.interactionId })}\n\n`,
      );
    } catch (error: any) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: error?.message ?? 'Lỗi không xác định' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
