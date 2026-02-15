/**
 * OpenCode Provider Integration
 * This module integrates Gemini Business Pool with OpenCode
 */

import { AccountManager } from './account-manager.js';
import { GeminiBusinessProvider } from './gemini-provider.js';
import { ChatCompletionRequest, ChatCompletionResponse } from './types.js';

export class OpenCodeGeminiBusinessProvider {
  private accountManager: AccountManager;
  private maxRetries: number = 3;

  constructor(accountManager: AccountManager) {
    this.accountManager = accountManager;
  }

  /**
   * Initialize provider
   */
  async initialize(): Promise<void> {
    await this.accountManager.loadAccounts();

    const accounts = this.accountManager.getAccounts();
    if (accounts.length === 0) {
      throw new Error(
        'No Gemini Business accounts configured. Please add accounts using:\n' +
        'opencode-gemini-business add-account'
      );
    }

    console.log(`Initialized with ${accounts.length} account(s)`);
  }

  /**
   * Execute chat completion with automatic retry and account rotation
   */
  async chatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionResponse>> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.maxRetries) {
      const account = this.accountManager.getNextAccount();
      if (!account) {
        throw new Error('No available accounts. All accounts may be disabled due to errors.');
      }

      try {
        const provider = new GeminiBusinessProvider(account);

        // Check if JWT needs refresh
        if (this.accountManager.needsJWTRefresh(account)) {
          console.log(`Refreshing JWT for account ${account.name}...`);
          await provider.getJWT();
        }

        const response = await provider.chatCompletion(request);

        // Success! Reset error count for this account
        this.accountManager.resetAccountErrors(account.id);

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Request failed with account ${account.name}:`, lastError.message);

        // Mark account as failed
        this.accountManager.markAccountError(account.id, lastError.message);

        attempts++;

        // Wait before retry
        if (attempts < this.maxRetries) {
          const delay = 1000 * attempts; // Exponential backoff
          console.log(`Retrying in ${delay}ms... (attempt ${attempts + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `All retry attempts failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * List available models from active account
   */
  async listModels() {
    const account = this.accountManager.getNextAccount();
    if (!account) {
      throw new Error('No available accounts');
    }

    const provider = new GeminiBusinessProvider(account);
    return await provider.listModels();
  }

  /**
   * Get account manager instance
   */
  getAccountManager(): AccountManager {
    return this.accountManager;
  }
}

/**
 * Create and initialize provider instance
 */
export async function createProvider(): Promise<OpenCodeGeminiBusinessProvider> {
  const accountManager = new AccountManager();
  const provider = new OpenCodeGeminiBusinessProvider(accountManager);
  await provider.initialize();
  return provider;
}
