/**
 * Gemini Business API Client - handles direct API communication with Gemini Business
 *
 * Uses correct endpoints:
 * - https://business.gemini.google/auth/getoxsrf (XSRF token)
 * - https://biz-discoveryengine.googleapis.com/v1alpha/locations/global/widgetCreateSession (session)
 * - https://biz-discoveryengine.googleapis.com/v1alpha/locations/global/widgetStreamAssist (chat)
 */

import fetch from 'node-fetch';
import { createHmac } from 'crypto';
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
   * Create JWT token from xsrfToken and keyId
   */
  private createJWT(xsrfToken: string, keyId: string): string {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: keyId,
    };

    const payload = {
      iss: 'https://business.gemini.google',
      aud: 'https://biz-discoveryengine.googleapis.com',
      sub: `csesidx/${this.account.csesidx}`,
      iat: now,
      exp: now + 300, // 5 minutes
      nbf: now,
    };

    // Base64url encode
    const base64url = (str: string) =>
      Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const message = `${headerB64}.${payloadB64}`;

    // Decode xsrfToken to get key bytes
    const padding = '='.repeat((4 - (xsrfToken.length % 4)) % 4);
    const keyBytes = Buffer.from(xsrfToken + padding, 'base64url');

    // Create HMAC signature
    const signature = createHmac('sha256', keyBytes).update(message).digest();
    const signatureB64 = signature.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${message}.${signatureB64}`;
  }

  /**
   * Get JWT token (created from XSRF token)
   * Tokens are cached for 5 minutes
   */
  private async getJWT(): Promise<string> {
    // Check if cached JWT is still valid
    if (this.account.xsrf_token && this.account.xsrf_expires) {
      if (Date.now() < this.account.xsrf_expires) {
        return this.account.xsrf_token; // Actually stores JWT
      }
    }

    try {
      const url = `${GETOXSRF_URL}?csesidx=${this.account.csesidx}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cookie': this.buildCookieHeader(),
          'User-Agent': this.getUserAgent(),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get XSRF token: ${response.status} ${response.statusText}\n${errorText}`);
      }

      let text = await response.text();

      // Remove XSS protection prefix )]}'
      if (text.startsWith(")]}'\n")) {
        text = text.substring(5);
      }

      const data = JSON.parse(text) as { xsrfToken: string; keyId: string };

      // Create JWT from xsrfToken and keyId
      const jwt = this.createJWT(data.xsrfToken, data.keyId);

      // Cache JWT for 5 minutes (JWT expires in 5 minutes)
      this.account.xsrf_token = jwt; // Store JWT in xsrf_token field
      this.account.xsrf_expires = Date.now() + (4.5 * 60 * 1000); // 4.5 minutes to be safe

      return jwt;
    } catch (error) {
      throw new Error(`JWT retrieval failed: ${error}`);
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
      const jwt = await this.getJWT();

      // Generate random session ID
      const sessionId = Math.random().toString(36).substring(2, 14);

      const body = {
        configId: this.account.team_id,
        additionalParams: { token: '-' },
        createSessionRequest: {
          session: {
            name: sessionId,
            displayName: sessionId,
          },
        },
      };

      const response = await fetch(CREATE_SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'User-Agent': this.getUserAgent(),
          'Origin': 'https://business.gemini.google',
          'Referer': 'https://business.gemini.google/',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = (await response.json()) as { session: { name: string } };

      // Cache session for 50 minutes
      this.account.session_id = data.session.name;
      this.account.session_expires = Date.now() + (50 * 60 * 1000);

      return data.session.name;
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
      const xsrfToken = await this.getJWT();

      // Convert OpenAI format to Gemini Business format
      const geminiRequest = this.convertToGeminiFormat(request, sessionId);

      const response = await fetch(STREAM_ASSIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xsrfToken}`,
          'Origin': 'https://business.gemini.google',
          'Referer': 'https://business.gemini.google/',
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
    return `__Secure-C_SES=${this.account.cookies.secure_c_ses}; __Host-C_OSES=${this.account.cookies.host_c_oses}`;
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
    // Build query parts from messages
    const queryParts = this.buildQueryParts(request.messages);

    // Map model name to Gemini internal model ID
    const modelId = this.mapModelId(request.model);

    return {
      configId: this.account.team_id,
      additionalParams: { token: '-' },
      streamAssistRequest: {
        session: sessionId,
        query: { parts: queryParts },
        filter: '',
        fileIds: [],
        answerGenerationMode: 'NORMAL',
        assistGenerationConfig: {
          modelId: modelId,
        },
        toolsSpec: {
          webGroundingSpec: {},
          toolRegistry: 'default_tool_registry',
          imageGenerationSpec: {},
          videoGenerationSpec: {},
        },
        languageCode: 'en-US',
        userMetadata: { timeZone: 'Etc/GMT' },
        assistSkippingMode: 'REQUEST_ASSIST',
      },
    };
  }

  /**
   * Build query parts from OpenAI messages array
   */
  private buildQueryParts(messages: ChatMessage[]): any[] {
    // Combine all messages into a single text prompt
    const fullPrompt = messages
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

    return [{ text: fullPrompt }];
  }

  /**
   * Map OpenAI model names to Gemini internal model IDs
   */
  private mapModelId(model?: string): string {
    const modelMap: Record<string, string> = {
      'gemini-2.5-pro': 'gemini-3-pro-preview',
      'gemini-2.5-flash': 'gemini-3-flash-preview',
      'gemini-2.0-pro': 'gemini-2-pro',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
    };

    return modelMap[model || 'gemini-2.5-pro'] || 'gemini-3-pro-preview';
  }

  /**
   * Convert Gemini Business format to OpenAI format
   */
  private convertToOpenAIFormat(data: any, model: string): ChatCompletionResponse {
    // Gemini Business returns an array of response chunks
    // We need to collect text from all chunks, ignoring "thought" parts
    let fullText = '';

    if (Array.isArray(data)) {
      for (const chunk of data) {
        const answer = chunk.streamAssistResponse?.answer;
        if (!answer || !answer.replies) continue;

        for (const reply of answer.replies) {
          const content = reply.groundedContent?.content;
          if (content && content.text && !content.thought) {
            fullText += content.text;
          }
        }
      }
    }

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
            content: fullText.trim(),
          },
          finish_reason: 'stop',
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
      await this.getJWT();

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
