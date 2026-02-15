/**
 * Gemini Business API Client - handles direct API communication with Gemini Business
 *
 * Uses correct endpoints:
 * - https://business.gemini.google/auth/getoxsrf (XSRF token)
 * - https://biz-discoveryengine.googleapis.com/v1alpha/locations/global/widgetCreateSession (session)
 * - https://biz-discoveryengine.googleapis.com/v1alpha/locations/global/widgetStreamAssist (chat)
 */

import fetch from 'node-fetch';
import {
  GeminiBusinessAccount,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from './types.js';

// Gemini Business API Endpoints
const BASE_URL = 'https://biz-discoveryengine.googleapis.com/v1alpha/locations/global';
const CREATE_SESSION_URL = `${BASE_URL}/widgetCreateSession`;
const STREAM_ASSIST_URL = `${BASE_URL}/widgetStreamAssist`;
const GETOXSRF_URL = 'https://business.gemini.google/auth/getoxsrf';

export class GeminiBusinessAPI {
  private account: GeminiBusinessAccount;

  constructor(account: GeminiBusinessAccount) {
    this.account = account;
  }

  /**
   * Get XSRF token from business.gemini.google
   * Tokens are cached for 55 minutes
   */
  private async getXSRFToken(): Promise<string> {
    // Check if cached token is still valid
    if (this.account.xsrf_token && this.account.xsrf_expires) {
      if (Date.now() < this.account.xsrf_expires) {
        return this.account.xsrf_token;
      }
    }

    try {
      const response = await fetch(GETOXSRF_URL, {
        method: 'POST',
        headers: {
          'Cookie': this.buildCookieHeader(),
          'User-Agent': this.getUserAgent(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get XSRF token: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json() as { token: string };

      // Cache token for 55 minutes
      this.account.xsrf_token = data.token;
      this.account.xsrf_expires = Date.now() + (55 * 60 * 1000);

      return data.token;
    } catch (error) {
      throw new Error(`XSRF token retrieval failed: ${error}`);
    }
  }

  /**
   * Create session with widgetCreateSession
   * Sessions are cached for 50 minutes
   */
  private async createSession(): Promise<string> {
    // Check if cached session is still valid
    if (this.account.session_id && this.account.session_expires) {
      if (Date.now() < this.account.session_expires) {
        return this.account.session_id;
      }
    }

    try {
      const xsrfToken = await this.getXSRFToken();

      const response = await fetch(CREATE_SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.buildCookieHeader(),
          'X-Goog-Team-Id': this.account.team_id,
          'X-XSRF-Token': xsrfToken,
          'User-Agent': this.getUserAgent(),
        },
        body: JSON.stringify({
          team_id: this.account.team_id,
          csesidx: this.account.csesidx,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json() as { session_id: string };

      // Cache session for 50 minutes
      this.account.session_id = data.session_id;
      this.account.session_expires = Date.now() + (50 * 60 * 1000);

      return data.session_id;
    } catch (error) {
      throw new Error(`Session creation failed: ${error}`);
    }
  }

  /**
   * Send chat completion request to widgetStreamAssist
   */
  async chatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionResponse>> {
    try {
      const sessionId = await this.createSession();
      const xsrfToken = await this.getXSRFToken();

      // Convert OpenAI format to Gemini Business format
      const geminiRequest = this.convertToGeminiFormat(request, sessionId);

      const response = await fetch(STREAM_ASSIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.buildCookieHeader(),
          'X-Goog-Team-Id': this.account.team_id,
          'X-XSRF-Token': xsrfToken,
          'User-Agent': this.getUserAgent(),
        },
        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat completion failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      // Handle streaming response
      if (request.stream) {
        return this.handleStreamResponse(response, request.model);
      }

      // Handle non-streaming response
      const data = await response.json();
      return this.convertToOpenAIFormat(data, request.model);
    } catch (error) {
      throw new Error(`Chat completion request failed: ${error}`);
    }
  }

  /**
   * Build cookie header string
   */
  private buildCookieHeader(): string {
    return `__Secure-c_ses=${this.account.cookies.secure_c_ses}; __Host-c_oses=${this.account.cookies.host_c_oses}`;
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    return (
      this.account.user_agent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  /**
   * Convert OpenAI format to Gemini Business format
   */
  private convertToGeminiFormat(
    request: ChatCompletionRequest,
    sessionId: string
  ): any {
    // Build prompt from messages
    const prompt = this.buildPromptFromMessages(request.messages);

    return {
      session_id: sessionId,
      prompt,
      model: request.model || 'gemini-2.5-pro',
      stream: request.stream || false,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
    };
  }

  /**
   * Build prompt string from OpenAI messages array
   */
  private buildPromptFromMessages(messages: ChatMessage[]): string {
    return messages
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'Assistant' : msg.role === 'system' ? 'System' : 'User';

        if (typeof msg.content === 'string') {
          return `${role}: ${msg.content}`;
        } else {
          // Handle multimodal content (text + images)
          const textParts = msg.content
            .filter((part) => part.type === 'text' && part.text)
            .map((part) => part.text)
            .join(' ');
          return `${role}: ${textParts}`;
        }
      })
      .join('\n\n');
  }

  /**
   * Convert Gemini Business format to OpenAI format
   */
  private convertToOpenAIFormat(data: any, model: string): ChatCompletionResponse {
    const content = data.text || data.content || '';
    const finishReason = data.finish_reason || 'stop';

    return {
      id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: finishReason,
        },
      ],
      usage: {
        prompt_tokens: 0, // Gemini Business doesn't provide token counts
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  /**
   * Handle streaming SSE response
   */
  private async *handleStreamResponse(
    response: any,
    model: string
  ): AsyncIterable<ChatCompletionResponse> {
    const reader = response.body;
    let buffer = '';

    try {
      for await (const chunk of reader) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines and [DONE] marker
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          // Parse SSE data
          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6);
              const data = JSON.parse(jsonStr);

              // Convert to OpenAI streaming format
              yield {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      role: 'assistant',
                      content: data.text || data.content || '',
                    },
                    finish_reason: data.finish_reason || null,
                  },
                ],
              };
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream reading error:', error);
      throw error;
    }
  }

  /**
   * Test account credentials and connectivity
   */
  async testAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test 1: Get XSRF token
      await this.getXSRFToken();

      // Test 2: Create session
      await this.createSession();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if session needs refresh
   */
  needsSessionRefresh(): boolean {
    if (!this.account.session_id || !this.account.session_expires) {
      return true;
    }

    const now = Date.now();
    const expiresIn = this.account.session_expires - now;

    // Refresh if less than 5 minutes remaining
    return expiresIn < (5 * 60 * 1000);
  }

  /**
   * Force refresh session
   */
  async refreshSession(): Promise<void> {
    // Clear cached session
    this.account.session_id = undefined;
    this.account.session_expires = undefined;

    // Create new session
    await this.createSession();
  }
}
