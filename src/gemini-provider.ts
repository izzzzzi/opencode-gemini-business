/**
 * Gemini Business Provider - handles API communication with Gemini Business
 */

import fetch from 'node-fetch';
import { GeminiBusinessAccount, ChatCompletionRequest, ChatCompletionResponse, ModelInfo } from './types.js';

const GEMINI_API_BASE = 'https://aistudio.google.com';

export class GeminiBusinessProvider {
  private account: GeminiBusinessAccount;
  private baseUrl: string;

  constructor(account: GeminiBusinessAccount, baseUrl?: string) {
    this.account = account;
    this.baseUrl = baseUrl || GEMINI_API_BASE;
  }

  /**
   * Get or refresh JWT token
   */
  async getJWT(): Promise<string> {
    if (this.account.jwt && this.account.jwt_expires) {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = this.account.jwt_expires - now;

      // Return existing JWT if still valid for more than 5 minutes
      if (expiresIn > 300) {
        return this.account.jwt;
      }
    }

    // Refresh JWT
    return await this.refreshJWT();
  }

  /**
   * Refresh JWT token using cookies
   */
  private async refreshJWT(): Promise<string> {
    try {
      const headers: Record<string, string> = {
        'Cookie': `__Secure-c_ses=${this.account.cookies.secure_c_ses}; __Host-c_oses=${this.account.cookies.host_c_oses}`,
        'User-Agent': this.account.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'X-Goog-Team-Id': this.account.team_id,
      };

      // Call Google's JWT endpoint
      const response = await fetch(`${this.baseUrl}/api/auth/jwt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          team_id: this.account.team_id,
          csesidx: this.account.csesidx,
        }),
      });

      if (!response.ok) {
        throw new Error(`JWT refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { jwt: string; expires_in: number };
      this.account.jwt = data.jwt;
      this.account.jwt_expires = Math.floor(Date.now() / 1000) + data.expires_in;

      return data.jwt;
    } catch (error) {
      throw new Error(`Failed to refresh JWT: ${error}`);
    }
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionResponse>> {
    const jwt = await this.getJWT();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'User-Agent': this.account.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Goog-Team-Id': this.account.team_id,
    };

    const body = JSON.stringify({
      model: request.model,
      messages: request.messages,
      stream: request.stream || false,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
    });

    const response = await fetch(`${this.baseUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat completion failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    // Handle streaming response
    if (request.stream) {
      return this.handleStreamResponse(response);
    }

    // Handle non-streaming response
    const data = await response.json() as ChatCompletionResponse;
    return data;
  }

  /**
   * Handle streaming response (SSE)
   */
  private async *handleStreamResponse(response: any): AsyncIterable<ChatCompletionResponse> {
    const reader = response.body;
    let buffer = '';

    for await (const chunk of reader) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            yield json as ChatCompletionResponse;
          } catch (error) {
            console.error('Failed to parse SSE data:', error);
          }
        }
      }
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelInfo[]> {
    const jwt = await this.getJWT();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${jwt}`,
      'User-Agent': this.account.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Goog-Team-Id': this.account.team_id,
    };

    const response = await fetch(`${this.baseUrl}/api/v1/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: ModelInfo[] };
    return data.data;
  }

  /**
   * Test account credentials
   */
  async testAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getJWT();
      await this.listModels();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
