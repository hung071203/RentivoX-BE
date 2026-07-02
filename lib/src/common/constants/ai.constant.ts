import { ToolAIService } from '@lib/services/tool-ai.service';
import { UserRole } from '../enums';
import { GeminiTool_2 } from '../interfaces/gemini.interface';
import { PAGE_TOPICS } from './page-links.constant';

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
  {
    type: 'function',
    name: AI_SV_PROTOTYPE.getFrontendPageLink.name,
    description:
      'Lấy đường dẫn (route) trang trên giao diện web tương ứng với 1 tính năng, để hướng dẫn người dùng điều hướng đến đúng trang khi họ không biết vào đâu. Chỉ trả về trang phù hợp với vai trò hiện tại của người dùng.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Chủ đề/tính năng người dùng muốn tìm trang tương ứng',
          enum: PAGE_TOPICS,
        },
      },
      required: ['topic'],
    },
  },
];

// Tools chỉ đọc (read-only) dùng chung cho Admin + Super Admin
export const ADMIN_TOOLS: GeminiTool_2[] = [
  {
    type: 'function',
    name: AI_SV_PROTOTYPE.getSystemOverview.name,
    description:
      'Xem thống kê tổng quan toàn hệ thống: tổng số chủ trọ, người thuê, nhà trọ, phòng, tỷ lệ lấp đầy và top 5 chủ trọ có nhiều phòng nhất.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    type: 'function',
    name: AI_SV_PROTOTYPE.searchUsers.name,
    description:
      'Tìm kiếm/liệt kê tài khoản admin hoặc chủ trọ theo tên, email, vai trò, trạng thái hoạt động. Dùng để tra cứu thông tin hoặc lấy userId trước khi xem chi tiết.',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Tìm theo tên hoặc email',
        },
        role: {
          type: 'string',
          description: 'Lọc theo vai trò',
          enum: ['admin', 'landlord'],
        },
        isActive: {
          type: 'boolean',
          description: 'Lọc theo trạng thái hoạt động (true = đang hoạt động)',
        },
        page: { type: 'integer', description: 'Số trang, mặc định 1' },
        limit: {
          type: 'integer',
          description: 'Số kết quả mỗi trang, mặc định 20, tối đa 100',
        },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: AI_SV_PROTOTYPE.getUserDetail.name,
    description: 'Xem chi tiết thông tin 1 tài khoản (admin hoặc chủ trọ) theo id.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID của tài khoản cần xem' },
      },
      required: ['userId'],
    },
  },
  {
    type: 'function',
    name: AI_SV_PROTOTYPE.listProperties.name,
    description:
      'Xem danh sách nhà trọ trong toàn hệ thống, có thể lọc theo tên/địa chỉ hoặc theo chủ trọ.',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Tìm theo tên nhà trọ hoặc địa chỉ',
        },
        landlordId: {
          type: 'string',
          description: 'Lọc theo id chủ trọ sở hữu',
        },
        page: { type: 'integer', description: 'Số trang, mặc định 1' },
        limit: {
          type: 'integer',
          description: 'Số kết quả mỗi trang, mặc định 20, tối đa 100',
        },
      },
      required: [],
    },
  },
];

export const GEMINI_TOOLS = {
  [UserRole.SUPER_ADMIN]: [...BASE_TOOLS, ...ADMIN_TOOLS],
  [UserRole.ADMIN]: [...BASE_TOOLS, ...ADMIN_TOOLS],
  [UserRole.LANDLORD]: [...BASE_TOOLS],
  [UserRole.TENANT]: [...BASE_TOOLS],
};
