/**
 * Types for Gemini Business Pool
 */

// ============================================================================
// Account Types
// ============================================================================

export interface GeminiBusinessAccount {
  id: string;
  name: string;
  team_id: string;
  cookies: {
    secure_c_ses: string;  // __Secure-c_ses
    host_c_oses: string;   // __Host-c_oses
  };
  csesidx: string;
  user_agent?: string;

  // Session management (Gemini Business uses sessions, not JWT)
  cached_jwt?: string;
  cached_jwt_expires?: number;

  /** @deprecated Use cached_jwt — kept for config migration */
  xsrf_token?: string;
  /** @deprecated Use cached_jwt_expires — kept for config migration */
  xsrf_expires?: number;
  session_id?: string;
  session_expires?: number;

  // Health tracking
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
  session_refresh_threshold: number; // seconds before expiry to refresh
  error_threshold: number; // disable account after N consecutive errors
}

// ============================================================================
// Gemini Business API Types
// ============================================================================

export interface GeminiBusinessSession {
  session_id: string;
  expires_at: number;
}

export interface XSRFTokenResponse {
  token: string;
  expires: number;
}

export interface WidgetCreateSessionRequest {
  team_id: string;
  csesidx: string;
}

export interface WidgetStreamAssistRequest {
  session_id: string;
  prompt: string;
  model: string;
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface WidgetStreamAssistResponse {
  text?: string;
  content?: string;
  model: string;
  finish_reason?: string;
}

// ============================================================================
// OpenAI-Compatible Types (for compatibility)
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string }
  }>;
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

// ============================================================================
// Browser Auth Types
// ============================================================================

export interface BrowserAuthOptions {
  /** Overall timeout in ms (default: 600000 = 10 min) */
  timeout?: number;
  /** Inactivity reminder delay in ms after login detected (default: 300000 = 5 min) */
  reminderDelay?: number;
  /** Cookie poll interval in ms (default: 2000) */
  pollInterval?: number;
  /** Account name (optional, auto-generated if not provided) */
  name?: string;
}

export interface CapturedCredentials {
  cookies: {
    secure_c_ses: string;
    host_c_oses: string;
  };
  csesidx: string;
  team_id: string;
  user_agent: string;
}
