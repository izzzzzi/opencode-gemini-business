/**
 * Types for Gemini Business Pool
 */

export interface GeminiBusinessAccount {
  id: string;
  name: string;
  team_id: string;
  cookies: {
    secure_c_ses: string;
    host_c_oses: string;
  };
  csesidx: string;
  user_agent?: string;
  jwt?: string;
  jwt_expires?: number;
  enabled: boolean;
  last_used?: number;
  error_count?: number;
  last_error?: string;
}

export interface PoolConfig {
  accounts: GeminiBusinessAccount[];
  rotation_strategy: 'round-robin' | 'least-used' | 'random';
  max_retries: number;
  retry_delay: number;
  jwt_refresh_threshold: number; // seconds before expiry to refresh
  error_threshold: number; // disable account after N consecutive errors
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}
