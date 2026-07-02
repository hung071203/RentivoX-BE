import { GoogleGenAI } from '@google/genai';
import {
  AI_PROMPT,
  GEMINI_RESPONSE_SCHEMA,
  GEMINI_TOOLS,
} from '@lib/common/constants/ai.constant';
import { UserRole } from '@lib/common/enums';
import {
  GeminiChatResponse,
  GeminiOrcIdentifyImageResponse,
  GeminiRunInteractionResponse,
} from '@lib/common/interfaces/gemini.interface';
import { ENV } from '@lib/configs/env.config';
import { Injectable, Logger } from '@nestjs/common';
import type { Interactions } from '@google/genai';
import { User } from '@entities/user.entity';
import { ToolAIService } from './tool-ai.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  private readonly client: GoogleGenAI;

  constructor(private readonly toolAIService: ToolAIService) {
    this.client = new GoogleGenAI({
      apiKey: ENV.googleApiKey,
    });
  }

  async orcIdentifyImage(
    image1Base64: string,
    image2Base64: string,
  ): Promise<GeminiOrcIdentifyImageResponse> {
    try {
      const response = await this.client.interactions.create({
        model: 'gemini-3.1-flash-lite',
        input: [
          { type: 'text', text: AI_PROMPT.ORC_IDENTIFY_IMAGE },
          {
            type: 'image',
            data: image1Base64,
            mime_type: 'image/jpeg',
          },
          {
            type: 'image',
            data: image2Base64,
            mime_type: 'image/jpeg',
          },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: GEMINI_RESPONSE_SCHEMA.ORC_IDENTIFY_IMAGE,
        },
      });

      const textResponse = response.output_text;
      return JSON.parse(textResponse!) as GeminiOrcIdentifyImageResponse;
    } catch (error) {
      this.logger.error('Error in orcIdentifyImage:', error);
      throw error;
    }
  }

  private handleStartStep(
    event: Interactions.StepStart,
    currentCalls: Map<any, { name: string; arguments: string }>,
  ) {
    const { index, step } = event;
    switch (step.type) {
      case 'function_call': {
        currentCalls.set(index, {
          name: step.name,
          arguments:
            step.arguments && Object.keys(step.arguments).length
              ? JSON.stringify(step.arguments)
              : '',
        });
        break;
      }
    }
  }

  handleDeltaStep(
    event: Interactions.StepDelta,
    currentCalls: Map<any, { name: string; arguments: string }>,
    textCallback: (response: any) => void,
  ) {
    const { index, delta } = event;

    switch (delta.type) {
      case 'arguments' as 'arguments_delta': {
        currentCalls.get(index)!.arguments += delta?.['partial_arguments'];
        break;
      }
      case 'arguments_delta': {
        currentCalls.get(index)!.arguments += delta.arguments;
        break;
      }
      case 'text': {
        textCallback(delta.text);
        break;
      }
    }
  }

  private async runInteraction(
    {
      input,
      previous_interaction_id,
    }: {
      input: string;
      previous_interaction_id?: string;
    },
    userRole: UserRole,
    textCallback: (response: any) => void,
  ): Promise<GeminiRunInteractionResponse> {
    const stream = await this.client.interactions.create({
      model: 'gemini-3.1-flash-lite',
      input,
      previous_interaction_id,
      tools: GEMINI_TOOLS[userRole],
      stream: true,
    });

    const currentCalls = new Map<
      any,
      {
        name: string;
        arguments: string;
      }
    >();

    const res: GeminiRunInteractionResponse = {
      toolCalls: [],
      interaction_id: null,
    };

    for await (const event of stream) {
      switch (event.event_type) {
        case 'step.start': {
          this.handleStartStep(event, currentCalls);
          break;
        }
        case 'step.delta': {
          this.handleDeltaStep(event, currentCalls, textCallback);
          break;
        }
        case 'interaction.complete' as 'interaction.completed':
        case 'interaction.completed': {
          res.interaction_id = event.interaction.id;
        }
      }
    }

    res.toolCalls = Array.from(currentCalls.values()).map((call) => ({
      name: call.name,
      arguments: call.arguments ? JSON.parse(call.arguments) : {},
    }));

    return res;
  }

  async chat(
    form: {
      input: string;
      previous_interaction_id?: string;
    },
    user: User,
    textCallback: (response: any) => void,
  ): Promise<GeminiChatResponse> {
    while (true) {
      try {
        const res = await this.runInteraction(form, user.role, textCallback);

        form.previous_interaction_id = res.interaction_id!;

        if (!res?.toolCalls?.length) {
          return { interactionId: res.interaction_id! };
        }

        const results: {
          name: string;
          result?: any;
          error?: string;
        }[] = [];

        for (const call of res.toolCalls) {
          try {
            const result = await this.toolAIService.handleFunctionCall(
              call.name,
              call.arguments,
              user,
            );
            results.push({ name: call.name, result });
          } catch (error: any) {
            this.logger.error(`Error executing tool ${call.name}:`, error);
            results.push({
              name: call.name,
              error: JSON.stringify({
                message: error.message,
                stack: error.stack,
              }),
            });
          }
        }

        form.input = `Tool execution results: ${JSON.stringify(results)}`;
      } catch (error) {
        this.logger.error('Error in chat interaction:', error);
        throw error;
      }
    }
  }
}
