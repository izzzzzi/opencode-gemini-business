# Codebase Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 18 audit findings across 3 priority waves — critical bugs, code quality, tests/polish.

**Architecture:** Targeted fixes to existing files. No new modules. Wave 1 fixes the fetch handler and account persistence. Wave 2 cleans up types, constants, and dead code. Wave 3 adds tests and CLI polish.

**Tech Stack:** TypeScript, vitest, node fs/promises

---

## File Map

| File | Changes |
|------|---------|
| `index.ts` | Fix error handler account bug, add retry loop, fix toSSEStream, reduce console noise |
| `src/account-manager.ts` | Add write mutex, persist on threshold, async `loadAccounts`, remove dead `needsSessionRefresh`, migrate `xsrf_token`→`cached_jwt`, fix `substr` |
| `src/gemini-business-api.ts` | Extract constants, rename `xsrf_token`→`cached_jwt`, fix `convertToOpenAIFormat`, fix `substr` |
| `src/types.ts` | Rename `xsrf_token`/`xsrf_expires` → `cached_jwt`/`cached_jwt_expires` |
| `cli.ts` | Add `--version`, add shell history warning |
| `vitest.config.ts` | Remove `passWithNoTests` |
| `src/account-manager.test.ts` | **New** — tests for rotation, errors, threshold, persistence |
| `src/gemini-business-api.test.ts` | Add `convertToOpenAIFormat` tests |
| `examples/opencode-config-example.json` | Update to match README format |
| `.github/RESEARCH.md` | Mark resolved issues |

---

## Task 1: Fix wrong account marked on error (spec 1.1)

**Files:**
- Modify: `index.ts:70-131`

- [ ] **Step 1: Write the failing test**

Create `index.test.ts` test that proves the bug. Actually — this bug is in the fetch handler which requires a full plugin setup with mocked AccountManager. The fix is small and obvious, so we'll fix directly and verify via existing tests + manual inspection.

- [ ] **Step 2: Fix the error handler**

In `index.ts`, move the `account` variable outside the try block so the catch block references the same account that failed:

```typescript
// REPLACE the entire fetch handler (index.ts lines 71-131):

async fetch(_input: any, init: any): Promise<any> {
  const config = accountManager.getConfig();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.max_retries; attempt++) {
    const account = accountManager.getNextAccount();
    if (!account) {
      throw new Error('No available accounts');
    }

    try {
      const api = new GeminiBusinessAPI(account);

      if (api.needsSessionRefresh()) {
        console.log(`   ⟳ Refreshing session for: ${account.name}`);
        await api.refreshSession();
        await accountManager.updateSession(
          account.id,
          account.session_id!,
          50 * 60 * 1000
        );
      }

      const requestBody = init?.body
        ? JSON.parse(init.body as string)
        : {};
      const response = await api.chatCompletion(requestBody);

      accountManager.resetAccountErrors(account.id);

      if (requestBody.stream) {
        if (!isAsyncIterable(response)) {
          throw new Error(
            'Provider returned non-stream response for stream request'
          );
        }

        return new Response(toSSEStream(response), {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      accountManager.markAccountError(account.id, errorMessage);
      lastError = error instanceof Error ? error : new Error(errorMessage);

      if (attempt < config.max_retries - 1) {
        await new Promise((r) => setTimeout(r, config.retry_delay));
      }
    }
  }

  throw new Error(
    `Gemini Business API Error after ${config.max_retries} attempts: ${lastError?.message}`
  );
},
```

This simultaneously fixes spec 1.1 (wrong account) and spec 1.2 (retry logic).

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, 20 tests pass

- [ ] **Step 4: Commit**

```bash
git add index.ts
git commit -m "fix: correct error attribution and add retry loop in fetch handler"
```

---

## Task 2: Fix toSSEStream fragile error handling (spec 1.3)

**Files:**
- Modify: `index.ts:17-38`

- [ ] **Step 1: Restructure toSSEStream**

Replace the `toSSEStream` function in `index.ts` (lines 17-38):

```typescript
function toSSEStream(
  chunks: AsyncIterable<unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
```

- [ ] **Step 2: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, 20 tests pass

- [ ] **Step 3: Commit**

```bash
git add index.ts
git commit -m "fix: make toSSEStream error handling explicit"
```

---

## Task 3: Persist account state on error threshold (spec 1.4)

**Files:**
- Modify: `src/account-manager.ts:141-153`

- [ ] **Step 1: Write the failing test**

Create `src/account-manager.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccountManager } from './account-manager.js';
import { writeFile, readFile, mkdir } from 'fs/promises';

// Mock fs to avoid touching real filesystem
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn(),
}));
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

describe('AccountManager', () => {
  let manager: AccountManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AccountManager();
  });

  describe('markAccountError persists on threshold', () => {
    it('saves accounts when error threshold disables an account', async () => {
      // Add account directly to config for testing
      const account = {
        name: 'test',
        team_id: 'team-1',
        cookies: { secure_c_ses: 'a', host_c_oses: 'b' },
        csesidx: '1',
        enabled: true,
      };
      const id = await manager.addAccount(account);
      vi.mocked(writeFile).mockClear();

      // Hit error threshold (default: 3)
      manager.markAccountError(id, 'fail 1');
      manager.markAccountError(id, 'fail 2');
      manager.markAccountError(id, 'fail 3');

      // Should have triggered saveAccounts on the 3rd error
      expect(writeFile).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/account-manager.test.ts`
Expected: FAIL — `markAccountError` doesn't call `saveAccounts`

- [ ] **Step 3: Make markAccountError persist when threshold is reached**

In `src/account-manager.ts`, change `markAccountError` (lines 141-153):

```typescript
  /**
   * Mark account as failed
   */
  markAccountError(accountId: string, error: string): void {
    const account = this.config.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    account.error_count = (account.error_count || 0) + 1;
    account.last_error = error;

    // Disable account if error threshold reached
    if (account.error_count >= this.config.error_threshold) {
      account.enabled = false;
      console.warn(`Account ${account.name} (${accountId}) disabled after ${account.error_count} errors`);
      // Persist the disabled state so it survives restart
      this.saveAccounts().catch((err) =>
        console.error('Failed to persist account state:', err)
      );
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/account-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/account-manager.ts src/account-manager.test.ts
git commit -m "fix: persist account state when error threshold disables an account"
```

---

## Task 4: Add AccountManager rotation and error tests (spec 3.1 partial)

**Files:**
- Modify: `src/account-manager.test.ts`

- [ ] **Step 1: Add rotation strategy tests**

Append to `src/account-manager.test.ts`:

```typescript
describe('getNextAccount', () => {
  it('returns null when no accounts exist', () => {
    expect(manager.getNextAccount()).toBeNull();
  });

  it('round-robin rotates through enabled accounts', async () => {
    await manager.addAccount({
      name: 'a', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
      csesidx: '1', enabled: true,
    });
    await manager.addAccount({
      name: 'b', team_id: 't2', cookies: { secure_c_ses: '2', host_c_oses: '2' },
      csesidx: '2', enabled: true,
    });

    const first = manager.getNextAccount();
    const second = manager.getNextAccount();
    const third = manager.getNextAccount();

    expect(first?.name).toBe('a');
    expect(second?.name).toBe('b');
    expect(third?.name).toBe('a'); // wraps around
  });

  it('skips disabled accounts', async () => {
    await manager.addAccount({
      name: 'disabled', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
      csesidx: '1', enabled: false,
    });
    await manager.addAccount({
      name: 'enabled', team_id: 't2', cookies: { secure_c_ses: '2', host_c_oses: '2' },
      csesidx: '2', enabled: true,
    });

    const result = manager.getNextAccount();
    expect(result?.name).toBe('enabled');
  });
});

describe('resetAccountErrors', () => {
  it('resets error count and last_error', async () => {
    const id = await manager.addAccount({
      name: 'test', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
      csesidx: '1', enabled: true,
    });

    manager.markAccountError(id, 'some error');
    manager.resetAccountErrors(id);

    const account = manager.getAccounts().find(a => a.id === id);
    expect(account?.error_count).toBe(0);
    expect(account?.last_error).toBeUndefined();
  });
});

describe('error threshold disabling', () => {
  it('disables account after reaching error_threshold', async () => {
    const id = await manager.addAccount({
      name: 'test', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
      csesidx: '1', enabled: true,
    });

    manager.markAccountError(id, 'err 1');
    manager.markAccountError(id, 'err 2');

    let account = manager.getAccounts().find(a => a.id === id);
    expect(account?.enabled).toBe(true); // not yet at threshold

    manager.markAccountError(id, 'err 3');

    account = manager.getAccounts().find(a => a.id === id);
    expect(account?.enabled).toBe(false); // threshold = 3
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/account-manager.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/account-manager.test.ts
git commit -m "test: add AccountManager rotation and error threshold tests"
```

---

## Task 5: Remove dead code and extract constants (spec 2.1, 2.2)

**Files:**
- Modify: `src/account-manager.ts:168-176` (remove `needsSessionRefresh`)
- Modify: `src/gemini-business-api.ts` (add constants)

- [ ] **Step 1: Remove dead `needsSessionRefresh` from AccountManager**

Delete lines 168-176 from `src/account-manager.ts`:

```typescript
  // DELETE this entire method:
  /**
   * Check if session needs refresh
   */
  needsSessionRefresh(account: GeminiBusinessAccount): boolean {
    if (!account.session_id || !account.session_expires) return true;

    const now = Date.now();
    const expiresIn = account.session_expires - now;

    return expiresIn < this.config.session_refresh_threshold * 1000;
  }
```

- [ ] **Step 2: Extract constants in gemini-business-api.ts**

Add named constants at the top of `src/gemini-business-api.ts`, after the imports (line 17), replacing the existing endpoint constants:

```typescript
// Gemini Business API Endpoints
const BASE_URL = 'https://biz-discoveryengine.googleapis.com/v1alpha/locations/global';
const CREATE_SESSION_URL = `${BASE_URL}/widgetCreateSession`;
const STREAM_ASSIST_URL = `${BASE_URL}/widgetStreamAssist`;
const GETOXSRF_URL = 'https://business.gemini.google/auth/getoxsrf';

// Timing constants
const SESSION_TTL_MS = 50 * 60 * 1000;       // 50 minutes
const JWT_CACHE_TTL_MS = 4.5 * 60 * 1000;    // 4.5 minutes (JWT expires at 5 min)
const SESSION_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh if < 5 min remaining
```

Then replace all inline numbers:
- `gemini-business-api.ts:113`: `this.account.xsrf_expires = Date.now() + (4.5 * 60 * 1000)` → `this.account.xsrf_expires = Date.now() + JWT_CACHE_TTL_MS`
- `gemini-business-api.ts:170`: `this.account.session_expires = Date.now() + (50 * 60 * 1000)` → `this.account.session_expires = Date.now() + SESSION_TTL_MS`
- `gemini-business-api.ts:510`: `return expiresIn < (5 * 60 * 1000)` → `return expiresIn < SESSION_REFRESH_THRESHOLD_MS`

Also update `index.ts` line 87: `50 * 60 * 1000` → import and use `SESSION_TTL_MS`. Actually — this value in index.ts duplicates what `createSession` already caches internally. But since it's used with `accountManager.updateSession`, keep it but use the same constant. Export `SESSION_TTL_MS` from gemini-business-api.ts:

```typescript
export const SESSION_TTL_MS = 50 * 60 * 1000;
```

And in `index.ts`, add import and replace:

```typescript
import { GeminiBusinessAPI, SESSION_TTL_MS } from './src/gemini-business-api.js';
```

Replace in index.ts:
```typescript
await accountManager.updateSession(
  account.id,
  account.session_id!,
  SESSION_TTL_MS
);
```

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/account-manager.ts src/gemini-business-api.ts index.ts
git commit -m "refactor: remove dead needsSessionRefresh, extract timing constants"
```

---

## Task 6: Fix deprecated substr and blocking existsSync (spec 2.3, 2.4)

**Files:**
- Modify: `src/account-manager.ts`
- Modify: `src/gemini-business-api.ts`

- [ ] **Step 1: Replace substr with substring**

In `src/account-manager.ts` line 73:
```typescript
// FROM:
const id = `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// TO:
const id = `account-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

In `src/gemini-business-api.ts` line 340:
```typescript
// FROM:
id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
// TO:
id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
```

- [ ] **Step 2: Replace existsSync with async access**

In `src/account-manager.ts`, change the import (line 6):
```typescript
// FROM:
import { existsSync } from 'fs';
// TO: (remove this import entirely)
```

Add `access` to the fs/promises import (line 6):
```typescript
import { readFile, writeFile, access, mkdir } from 'fs/promises';
```

Also add `mkdir` since `saveAccounts` may need to create the directory.

Replace `loadAccounts` (lines 33-53):
```typescript
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

      // Merge other config options if they exist
      if (saved.rotation_strategy) this.config.rotation_strategy = saved.rotation_strategy;
      if (saved.max_retries !== undefined) this.config.max_retries = saved.max_retries;

      console.log(`Loaded ${this.config.accounts.length} accounts`);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      throw new Error(`Failed to load accounts: ${error}`);
    }
  }
```

Also ensure `saveAccounts` creates the directory:
```typescript
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
```

- [ ] **Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/account-manager.ts src/gemini-business-api.ts
git commit -m "fix: replace deprecated substr, use async access instead of existsSync"
```

---

## Task 7: Add write mutex for file saves (spec 2.5)

**Files:**
- Modify: `src/account-manager.ts`

- [ ] **Step 1: Add write queue to AccountManager**

Add a `writeQueue` property and wrap `saveAccounts` in `src/account-manager.ts`:

After the `currentIndex` field (line 16):
```typescript
  private currentIndex: number = 0;
  private writeQueue: Promise<void> = Promise.resolve();
```

Replace `saveAccounts`:
```typescript
  async saveAccounts(): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => this.writeToDisk()).catch(() => {});
    return this.writeQueue;
  }

  private async writeToDisk(): Promise<void> {
    try {
      await mkdir(CONFIG_DIR, { recursive: true });
      const data = JSON.stringify(this.config, null, 2);
      await writeFile(ACCOUNTS_FILE, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save accounts:', error);
      throw new Error(`Failed to save accounts: ${error}`);
    }
  }
```

- [ ] **Step 2: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/account-manager.ts
git commit -m "fix: add write mutex to prevent concurrent file corruption"
```

---

## Task 8: Fix convertToOpenAIFormat for non-array responses (spec 2.6)

**Files:**
- Modify: `src/gemini-business-api.ts:320-360`
- Modify: `src/gemini-business-api.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/gemini-business-api.test.ts`:

```typescript
// Access private method for testing
function convertToOpenAIFormat(data: any, model: string): any {
  const api = new GeminiBusinessAPI(mockAccount);
  return (api as any).convertToOpenAIFormat(data, model);
}

describe('convertToOpenAIFormat', () => {
  it('extracts text from array of stream chunks', () => {
    const data = [
      {
        streamAssistResponse: {
          answer: {
            replies: [
              { groundedContent: { content: { text: 'Hello', thought: false } } },
            ],
          },
        },
      },
      {
        streamAssistResponse: {
          answer: {
            replies: [
              { groundedContent: { content: { text: ' World', thought: false } } },
            ],
          },
        },
      },
    ];

    const result = convertToOpenAIFormat(data, 'gemini-2.5-flash');
    expect(result.choices[0].message.content).toBe('Hello World');
  });

  it('handles single object response (non-array)', () => {
    const data = {
      streamAssistResponse: {
        answer: {
          replies: [
            { groundedContent: { content: { text: 'Single response', thought: false } } },
          ],
        },
      },
    };

    const result = convertToOpenAIFormat(data, 'gemini-2.5-flash');
    expect(result.choices[0].message.content).toBe('Single response');
  });

  it('filters out thought content', () => {
    const data = [
      {
        streamAssistResponse: {
          answer: {
            replies: [
              { groundedContent: { content: { text: 'thinking...', thought: true } } },
              { groundedContent: { content: { text: 'Actual answer', thought: false } } },
            ],
          },
        },
      },
    ];

    const result = convertToOpenAIFormat(data, 'gemini-2.5-pro');
    expect(result.choices[0].message.content).toBe('Actual answer');
  });

  it('returns empty content for unrecognized format', () => {
    const data = { unexpected: 'format' };
    const result = convertToOpenAIFormat(data, 'gemini-2.5-flash');
    expect(result.choices[0].message.content).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/gemini-business-api.test.ts`
Expected: FAIL — `handles single object response` returns empty string

- [ ] **Step 3: Fix convertToOpenAIFormat**

Replace `convertToOpenAIFormat` in `src/gemini-business-api.ts` (lines 320-360):

```typescript
  private convertToOpenAIFormat(data: any, model: string): ChatCompletionResponse {
    let fullText = '';

    const extractFromChunks = (chunks: any[]) => {
      for (const chunk of chunks) {
        const answer = chunk.streamAssistResponse?.answer;
        if (!answer || !answer.replies) continue;

        for (const reply of answer.replies) {
          const content = reply.groundedContent?.content;
          if (content && content.text && !content.thought) {
            fullText += content.text;
          }
        }
      }
    };

    if (Array.isArray(data)) {
      extractFromChunks(data);
    } else if (typeof data === 'object' && data !== null) {
      extractFromChunks([data]);
    }

    return {
      id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/gemini-business-api.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/gemini-business-api.ts src/gemini-business-api.test.ts
git commit -m "fix: handle non-array responses in convertToOpenAIFormat, add tests"
```

---

## Task 9: Rename xsrf_token → cached_jwt with migration (spec 2.7)

**Files:**
- Modify: `src/types.ts`
- Modify: `src/gemini-business-api.ts`
- Modify: `src/account-manager.ts`

- [ ] **Step 1: Rename fields in types.ts**

In `src/types.ts` lines 21-22:

```typescript
// FROM:
  xsrf_token?: string;
  xsrf_expires?: number;
// TO:
  cached_jwt?: string;
  cached_jwt_expires?: number;

  /** @deprecated Use cached_jwt — kept for config migration */
  xsrf_token?: string;
  /** @deprecated Use cached_jwt_expires — kept for config migration */
  xsrf_expires?: number;
```

- [ ] **Step 2: Update gemini-business-api.ts references**

In `src/gemini-business-api.ts`, update `getJWT` method:

Line 78-79 (cache check):
```typescript
// FROM:
    if (this.account.xsrf_token && this.account.xsrf_expires) {
      if (Date.now() < this.account.xsrf_expires) {
        return this.account.xsrf_token;
// TO:
    if (this.account.cached_jwt && this.account.cached_jwt_expires) {
      if (Date.now() < this.account.cached_jwt_expires) {
        return this.account.cached_jwt;
```

Line 112-113 (cache write):
```typescript
// FROM:
      this.account.xsrf_token = jwt;
      this.account.xsrf_expires = Date.now() + JWT_CACHE_TTL_MS;
// TO:
      this.account.cached_jwt = jwt;
      this.account.cached_jwt_expires = Date.now() + JWT_CACHE_TTL_MS;
```

- [ ] **Step 3: Add migration in loadAccounts**

In `src/account-manager.ts`, after parsing saved config in `loadAccounts`, add migration:

```typescript
      // Migrate deprecated xsrf_token → cached_jwt
      for (const account of this.config.accounts) {
        if (account.xsrf_token && !account.cached_jwt) {
          account.cached_jwt = account.xsrf_token;
          account.cached_jwt_expires = account.xsrf_expires;
          delete account.xsrf_token;
          delete account.xsrf_expires;
        }
      }
```

- [ ] **Step 4: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/gemini-business-api.ts src/account-manager.ts
git commit -m "refactor: rename xsrf_token to cached_jwt with backward-compatible migration"
```

---

## Task 10: Update example config (spec 2.8)

**Files:**
- Modify: `examples/opencode-config-example.json`

- [ ] **Step 1: Update to match README format**

Replace `examples/opencode-config-example.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gemini-business@latest"],
  "provider": {
    "gemini-business": {
      "name": "Gemini Business",
      "options": {
        "baseURL": "https://business.gemini.google/v1",
        "apiKey": "unused"
      },
      "models": {
        "gemini-2.5-flash": { "name": "Gemini 2.5 Flash" },
        "gemini-2.5-pro": { "name": "Gemini 2.5 Pro" },
        "gemini-3-flash": { "name": "Gemini 3 Flash" },
        "gemini-3.1-pro": { "name": "Gemini 3.1 Pro" },
        "auto": { "name": "Auto-select" }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add examples/opencode-config-example.json
git commit -m "docs: update example config to match current README format"
```

---

## Task 11: CLI polish — version flag and shell history warning (spec 3.2, 3.3)

**Files:**
- Modify: `cli.ts`

- [ ] **Step 1: Add version command**

In `cli.ts`, add a new case in the switch (after line 44) and a helper:

```typescript
    case 'version':
    case '--version':
    case '-v':
      await printVersion();
      break;
```

Add the function:

```typescript
async function printVersion() {
  try {
    const pkgPath = new URL('./package.json', import.meta.url).pathname;
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    console.log(`opencode-gemini-business v${pkg.version}`);
  } catch {
    console.log('opencode-gemini-business (version unknown)');
  }
}
```

- [ ] **Step 2: Add shell history warning to help and manual mode**

In `printHelp()`, add after the manual usage line (line 260):

```typescript
  console.log('  ⚠️  Warning: Passing credentials as arguments exposes them in shell history.');
  console.log('     Prefer environment variables or browser-based login.\n');
```

In the `addAccountManual` error message (line 123), add the same warning:

```typescript
    console.error('\n⚠️  Warning: Passing credentials as arguments exposes them in shell history.');
    console.error('   Prefer environment variables or browser-based login.');
```

- [ ] **Step 3: Add version to help output**

In `printHelp()`, add after the existing commands:

```typescript
  console.log('  version (or --version, -v)');
  console.log('    Show installed version\n');
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 type errors

- [ ] **Step 5: Commit**

```bash
git add cli.ts
git commit -m "feat: add --version flag, warn about credentials in shell history"
```

---

## Task 12: Reduce console noise in plugin (spec 3.4)

**Files:**
- Modify: `index.ts`

- [ ] **Step 1: Reduce loader log to single line, remove refresh log**

In `index.ts`, replace the verbose log in loader (lines 63-66):

```typescript
// FROM:
        console.log(
          `\n✅ Gemini Business: Loaded ${accounts.length} account(s)\n` +
            `   Strategy: ${accountManager.getConfig().rotation_strategy}\n`
        );
// TO:
        console.log(
          `✅ Gemini Business: ${accounts.length} account(s), ${accountManager.getConfig().rotation_strategy}`
        );
```

Remove the session refresh log inside the fetch handler:

```typescript
// REMOVE this line:
        console.log(`   ⟳ Refreshing session for: ${account.name}`);
```

- [ ] **Step 2: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add index.ts
git commit -m "fix: reduce console noise in plugin loader and fetch handler"
```

---

## Task 13: Update RESEARCH.md (spec 3.5)

**Files:**
- Modify: `.github/RESEARCH.md`

- [ ] **Step 1: Add resolution note at the top**

Add after the title (line 1):

```markdown
> **Note (2026-04-13):** The critical issues described below (wrong endpoints, wrong architecture, auth flow mismatch, API format mismatch) were all resolved in v2.0.0. The current codebase implements direct Gemini Business API integration with correct endpoints. This document is kept for historical reference.
```

- [ ] **Step 2: Commit**

```bash
git add .github/RESEARCH.md
git commit -m "docs: mark RESEARCH.md issues as resolved in v2.0.0"
```

---

## Task 14: Remove passWithNoTests (spec 3.6)

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Remove the option**

In `vitest.config.ts`, remove `passWithNoTests: true`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

- [ ] **Step 2: Run tests to confirm they still pass**

Run: `npx vitest run`
Expected: All tests pass (we have test files, so this is safe)

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test: remove passWithNoTests to catch accidental test deletion"
```

---

## Task 15: Final verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (original 20 + new ~12 = ~32 tests)

- [ ] **Step 3: Verify git log**

Run: `git log --oneline -15`
Expected: ~14 clean commits from this audit

- [ ] **Step 4: Done**

All 18 findings addressed across 3 waves.
