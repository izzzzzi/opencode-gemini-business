/**
 * Browser-based credential capture for Gemini Business accounts.
 *
 * Launches system Chrome via puppeteer-core, lets the user authenticate,
 * then extracts cookies and intercepts network requests to capture
 * csesidx and team_id automatically.
 */

import puppeteer, { type Page, type Browser, type HTTPRequest, type Cookie } from 'puppeteer-core';
import * as ChromeLauncher from 'chrome-launcher';
import { BrowserAuthOptions, CapturedCredentials } from './types.js';

const GEMINI_BUSINESS_URL = 'https://business.gemini.google';

const DEFAULT_OPTIONS: Required<BrowserAuthOptions> = {
  timeout: 10 * 60 * 1000,       // 10 minutes
  reminderDelay: 5 * 60 * 1000,  // 5 minutes
  pollInterval: 2000,             // 2 seconds
  name: '',
};

export class BrowserAuth {
  private options: Required<BrowserAuthOptions>;

  constructor(options?: BrowserAuthOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Find system Chrome/Chromium installation.
   * Throws a descriptive error if not found.
   */
  findChrome(): string {
    const installations = ChromeLauncher.Launcher.getInstallations();

    if (installations.length === 0) {
      throw new Error(
        '❌ Google Chrome not found on this system.\n\n' +
        '  Install Chrome: https://www.google.com/chrome/\n\n' +
        '  Or add an account manually:\n' +
        '    opencode-gemini-business add-account --manual <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx> [user_agent]'
      );
    }

    return installations[0];
  }

  /**
   * Launch headful Chrome with a temporary profile and navigate to Gemini Business.
   */
  private async launchBrowser(chromePath: string) {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
      ],
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.goto(GEMINI_BUSINESS_URL, { waitUntil: 'networkidle2' });

    return { browser, page };
  }

  /**
   * Poll cookies until login is detected.
   * Returns captured cookies or null on timeout.
   */
  private waitForCookies(
    page: Page,
    signal: AbortSignal,
  ): Promise<{ secure_c_ses: string; host_c_oses: string } | null> {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (signal.aborted) {
          clearInterval(interval);
          resolve(null);
          return;
        }

        try {
          const cookies = await page.cookies(GEMINI_BUSINESS_URL);
          const secureCses = cookies.find((c: Cookie) => c.name === '__Secure-C_SES');
          const hostCoses = cookies.find((c: Cookie) => c.name === '__Host-C_OSES');

          if (secureCses && hostCoses) {
            clearInterval(interval);
            resolve({
              secure_c_ses: secureCses.value,
              host_c_oses: hostCoses.value,
            });
          }
        } catch {
          // Page may have been closed
          clearInterval(interval);
          resolve(null);
        }
      }, this.options.pollInterval);
    });
  }

  /**
   * Set up request interception to capture csesidx and team_id.
   */
  private setupRequestInterception(page: Page): {
    getCaptured: () => { csesidx: string | null; team_id: string | null };
  } {
    let csesidx: string | null = null;
    let team_id: string | null = null;

    page.on('request', (request: HTTPRequest) => {
      const url = request.url();

      // Capture csesidx from getoxsrf request
      if (url.includes('getoxsrf') && !csesidx) {
        try {
          const parsed = new URL(url);
          const value = parsed.searchParams.get('csesidx');
          if (value) {
            csesidx = value;
          }
        } catch {
          // Ignore URL parse errors
        }
      }

      // Capture team_id (configId) from widgetCreateSession request
      if (url.includes('widgetCreateSession') && !team_id) {
        try {
          const postData = request.postData();
          if (postData) {
            const body = JSON.parse(postData);
            if (body.configId) {
              team_id = body.configId;
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    });

    return {
      getCaptured: () => ({ csesidx, team_id }),
    };
  }

  /**
   * Main orchestrator: launch browser, wait for login, capture credentials.
   */
  async captureCredentials(
    onStatus?: (message: string) => void,
  ): Promise<CapturedCredentials> {
    const log = onStatus || (() => {});

    // Find Chrome
    const chromePath = this.findChrome();
    log('🚀 Launching Chrome...');

    // Launch browser
    const { browser, page } = await this.launchBrowser(chromePath);

    // Capture User-Agent
    const userAgent = await page.evaluate('navigator.userAgent') as string;

    // Set up request interception
    const { getCaptured } = this.setupRequestInterception(page);

    // Set up abort controller for timeout
    const controller = new AbortController();
    const { signal } = controller;

    // Overall timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.options.timeout);

    // Handle browser close
    let browserClosed = false;
    browser.on('disconnected', () => {
      browserClosed = true;
      controller.abort();
    });

    try {
      log('🔑 Waiting for login... Please sign in to Gemini Business in the browser window.');

      // Phase 1: Wait for cookies (login detection)
      const cookies = await this.waitForCookies(page, signal);

      if (!cookies) {
        if (browserClosed) {
          throw new Error('Browser closed before login completed.');
        }
        throw new Error('Timeout — login not detected within the time limit. Try again or use --manual.');
      }

      log('✅ Logged in! Now send any message in the Gemini Business chat...');

      // Phase 2: Wait for network requests (csesidx + team_id)
      const reminderTimeout = setTimeout(() => {
        log('⏳ Still waiting... Please send a message in the Gemini Business chat to complete setup.');
      }, this.options.reminderDelay);

      const networkResult = await new Promise<{ csesidx: string; team_id: string }>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (signal.aborted) {
            clearInterval(checkInterval);
            clearTimeout(reminderTimeout);
            if (browserClosed) {
              reject(new Error('Browser closed before all credentials were captured.'));
            } else {
              reject(new Error('Timeout — try again or use --manual.'));
            }
            return;
          }

          const captured = getCaptured();
          if (captured.csesidx && captured.team_id) {
            clearInterval(checkInterval);
            clearTimeout(reminderTimeout);
            resolve({ csesidx: captured.csesidx, team_id: captured.team_id });
          }
        }, this.options.pollInterval);
      });

      // Close browser
      clearTimeout(timeoutId);
      await browser.close();

      return {
        cookies,
        csesidx: networkResult.csesidx,
        team_id: networkResult.team_id,
        user_agent: userAgent,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      try {
        await browser.close();
      } catch {
        // Browser may already be closed
      }
      throw error;
    }
  }
}
