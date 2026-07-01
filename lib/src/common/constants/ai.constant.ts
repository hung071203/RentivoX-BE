import { ToolAIService } from '@lib/services/tool-ai.service';
import { UserRole } from '../enums';
import { GeminiTool_2 } from '../interfaces/gemini.interface';

export const AI_PROMPT = {
  ORC_IDENTIFY_IMAGE: `
You are an OCR system specialized in scanning and extracting information from Vietnamese Citizen Identity Cards (CCCD).

Your task is to analyze both the front and back sides of a Vietnamese CCCD and return all extracted information in a structured JSON format.

Requirements:
1. Extract all visible text accurately.
2. Preserve Vietnamese characters and diacritics.
3. If a field is missing or unreadable, return null.
4. Return only valid JSON without explanations.
5. Identify which information belongs to the front side and which belongs to the back side.
6. Verify that both uploaded images are genuine Vietnamese Citizen Identity Card (CCCD) images. The front image must be the front side of a CCCD, and the back image must be the back side of a CCCD. If either image is not a CCCD, is the wrong side, is a different document type, or cannot be confidently identified as a CCCD, return: "success": false`,
};

export const GEMINI_RESPONSE_SCHEMA = {
  ORC_IDENTIFY_IMAGE: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description:
          'Indicates whether the image is a valid Vietnamese Citizen Identity Card (CCCD)',
      },
      front_side: {
        type: 'object',
        properties: {
          qr_code: {
            type: 'string',
            description: 'Raw content decoded from QR code',
          },
          id_number: {
            type: 'string',
            description: 'Vietnamese Citizen Identity Number',
          },
          full_name: {
            type: 'string',
            description: 'Full name',
          },
          gender: {
            type: 'string',
            description: 'Gender (male, female, other)',
          },
          nationality: {
            type: 'string',
            description: 'Nationality',
          },
          place_of_origin: {
            type: 'string',
            description: 'Place of origin (Quê quán)',
          },
          place_of_residence: {
            type: 'string',
            description: 'Place of residence (Nơi thường trú)',
          },
          date_of_birth: {
            type: 'string',
            description: 'Date of birth (Ngày sinh) in DD/MM/YYYY format',
          },
          valid_until: {
            type: 'string',
            description: 'Card expiration date (Có giá trị đến)',
          },
        },
        required: ['id_number', 'full_name'],
      },
      back_side: {
        type: 'object',
        properties: {
          identification_features: {
            type: 'string',
            description:
              'Personal identification features (Đặc điểm nhận dạng)',
          },
          issue_date: {
            type: 'string',
            description: 'Issue date (Ngày, tháng, năm)',
          },
          issue_authority: {
            type: 'string',
            description: 'Issuing authority (Nơi cấp)',
          },
        },
      },
    },
    required: ['success', 'front_side', 'back_side'],
  },
};

export const AI_SV_PROTOTYPE = ToolAIService.prototype;

export const BASE_TOOLS: GeminiTool_2[] = [
  {
    type: 'function',
    name: AI_SV_PROTOTYPE.getCurrentDate.name,
    description: 'Get the current date',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone string, e.g., "Asia/Ho_Chi_Minh"',
        },
      },
      required: [],
    },
  },
];

export const GEMINI_TOOLS = {
  [UserRole.SUPER_ADMIN]: BASE_TOOLS,
  [UserRole.ADMIN]: BASE_TOOLS,
  [UserRole.LANDLORD]: BASE_TOOLS,
  [UserRole.TENANT]: BASE_TOOLS,
};
