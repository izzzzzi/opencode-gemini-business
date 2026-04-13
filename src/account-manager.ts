/**
 * Account Manager for multi-account rotation
 */

import { GeminiBusinessAccount, PoolConfig } from './types.js';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.config', 'opencode');
const ACCOUNTS_FILE = join(CONFIG_DIR, 'gemini-business-accounts.json');

export class AccountManager {
  private config: PoolConfig;
  private currentIndex: number = 0;

  constructor(config?: Partial<PoolConfig>) {
    this.config = {
      accounts: [],
      rotation_strategy: 'round-robin',
      max_retries: 3,
      retry_delay: 1000,
      session_refresh_threshold: 300, // 5 minutes
      error_threshold: 3,
      ...config,
    };
  }

  /**
   * Load accounts from config file
   */
  async loadAccounts(): Promise<void> {
    try {
      await access(ACCOUNTS_FILE);
    } catch {
      console.warn(`No accounts file found at ${ACCOUNTS_FILE}`);
      return;
    }

    try {
      const data = await readFile(ACCOUNTS_FILE, 'utf-8');
      const saved = JSON.parse(data) as PoolConfig;
      this.config.accounts = saved.accounts || [];

      if (saved.rotation_strategy) this.config.rotation_strategy = saved.rotation_strategy;
      if (saved.max_retries !== undefined) this.config.max_retries = saved.max_retries;

      console.log(`Loaded ${this.config.accounts.length} accounts`);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      throw new Error(`Failed to load accounts: ${error}`);
    }
  }

  /**
   * Save accounts to config file
   */
  async saveAccounts(): Promise<void> {
    try {
      await mkdir(CONFIG_DIR, { recursive: true });
      const data = JSON.stringify(this.config, null, 2);
      await writeFile(ACCOUNTS_FILE, data, 'utf-8');
      console.log(`Saved ${this.config.accounts.length} accounts to ${ACCOUNTS_FILE}`);
    } catch (error) {
      console.error('Failed to save accounts:', error);
      throw new Error(`Failed to save accounts: ${error}`);
    }
  }

  /**
   * Add a new account
   */
  async addAccount(account: Omit<GeminiBusinessAccount, 'id'>): Promise<string> {
    const id = `account-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newAccount: GeminiBusinessAccount = {
      error_count: 0,
      ...account,
      id,
      enabled: account.enabled !== undefined ? account.enabled : true,
    };

    this.config.accounts.push(newAccount);
    await this.saveAccounts();
    return id;
  }

  /**
   * Remove an account
   */
  async removeAccount(id: string): Promise<boolean> {
    const index = this.config.accounts.findIndex(acc => acc.id === id);
    if (index === -1) return false;

    this.config.accounts.splice(index, 1);
    await this.saveAccounts();
    return true;
  }

  /**
   * Get next available account based on rotation strategy
   */
  getNextAccount(): GeminiBusinessAccount | null {
    const enabledAccounts = this.config.accounts.filter(acc => acc.enabled);

    if (enabledAccounts.length === 0) {
      console.error('No enabled accounts available');
      return null;
    }

    let account: GeminiBusinessAccount;

    switch (this.config.rotation_strategy) {
      case 'round-robin':
        account = enabledAccounts[this.currentIndex % enabledAccounts.length];
        this.currentIndex++;
        break;

      case 'least-used':
        account = enabledAccounts.reduce((least, current) => {
          const leastUsed = least.last_used || 0;
          const currentUsed = current.last_used || 0;
          return currentUsed < leastUsed ? current : least;
        });
        break;

      case 'random':
        account = enabledAccounts[Math.floor(Math.random() * enabledAccounts.length)];
        break;

      default:
        account = enabledAccounts[0];
    }

    // Update last used timestamp
    account.last_used = Date.now();
    return account;
  }

  /**
   * Mark account as failed
   */
  markAccountError(accountId: string, error: string): void {
    const account = this.config.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    account.error_count = (account.error_count || 0) + 1;
    account.last_error = error;

    if (account.error_count >= this.config.error_threshold) {
      account.enabled = false;
      console.warn(`Account ${account.name} (${accountId}) disabled after ${account.error_count} errors`);
      // Persist the disabled state so it survives restart
      this.saveAccounts().catch((err) =>
        console.error('Failed to persist account state:', err)
      );
    }
  }

  /**
   * Reset account errors (e.g., after successful request)
   */
  resetAccountErrors(accountId: string): void {
    const account = this.config.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    account.error_count = 0;
    account.last_error = undefined;
  }

  /**
   * Update account session
   */
  async updateSession(accountId: string, sessionId: string, expiresIn: number): Promise<void> {
    const account = this.config.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    account.session_id = sessionId;
    account.session_expires = Date.now() + expiresIn;
    await this.saveAccounts();
  }

  /**
   * Update XSRF token
   */
  async updateXSRFToken(accountId: string, token: string, expiresIn: number): Promise<void> {
    const account = this.config.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    account.xsrf_token = token;
    account.xsrf_expires = Date.now() + expiresIn;
    await this.saveAccounts();
  }

  /**
   * Get all accounts
   */
  getAccounts(): GeminiBusinessAccount[] {
    return this.config.accounts;
  }

  /**
   * Get config
   */
  getConfig(): PoolConfig {
    return this.config;
  }
}
