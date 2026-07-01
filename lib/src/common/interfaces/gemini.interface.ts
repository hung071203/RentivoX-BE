import { Gender } from '../enums';

export interface GeminiOrcIdentifyImageResponse {
  front_side: {
    id_number: string;
    full_name: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    place_of_origin?: string;
    place_of_residence?: string;
    qr_code?: string;
    valid_until?: string;
  };
  back_side: {
    identification_features?: string;
    issue_authority?: string;
    issue_date?: string;
  };
}

export interface ScanIdCardResult {
  idCardNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  permanentAddress?: string;
  idCardIssuedDate?: string;
  idCardIssuedPlace?: string;
}

export interface GeminiRunInteractionResponse {
  toolCalls: {
    name: string;
    arguments: Record<string, any>;
  }[];
  interaction_id: string | null;
}

declare type FunctionT = {
  type: 'function';
  /**
   * The name of the function.
   */
  name?: string | undefined;
  /**
   * A description of the function.
   */
  description?: string | undefined;
  /**
   * The JSON Schema for the function's parameters.
   */
  parameters?: any | undefined;
};

export type GeminiTool_2 = FunctionT;

export type GeminiChatResponse = {
  interactionId: string;
};
