# Codebase Audit: opencode-gemini-business

**Date**: 2026-04-13
**Version**: 2.2.0
**Approach**: By criticality — critical bugs first, then code quality, then tests/polish

---

## Scope

Full audit of the `opencode-gemini-business` codebase:
- 6 source files (index.ts, cli.ts, src/account-manager.ts, src/gemini-business-api.ts, src/browser-auth.ts, src/types.ts)
- 3 test files, 20 tests (all passing)
- TypeScript compiles with zero errors

---

## Wave 1: Critical Bugs

### 1.1 Wrong account marked on error (index.ts:120-129)

**Problem**: The `catch` block in the fetch handler calls `accountManager.getNextAccount()` again, which returns the NEXT account in rotation — not the one that failed. The error gets attributed to an innocent account. After 3 errors, a healthy account can be disabled.

**Fix**: Capture the account reference before the try block and reuse it in catch.

### 1.2 Retry logic declared but not implemented

**Problem**: `PoolConfig` defines `max_retries: 3` and `retry_delay: 1000`, but no retry loop exists anywhere. A single failure kills the request, even when other healthy accounts are available.

**Fix**: Add a retry loop in the fetch handler (index.ts) that tries the next account on failure, up to `max_retries` times.

### 1.3 toSSEStream fragile error handling (index.ts:24-37)

**Problem**: After `controller.error(error)`, the code relies on `return` to prevent `controller.close()` from being called. Removing the `return` would break the stream. The intent is unclear.

**Fix**: Restructure to make the flow explicit — move `controller.close()` into the try block's success path.

### 1.4 Account state not persisted (account-manager.ts)

**Problem**: `getNextAccount()` updates `last_used`, `markAccountError()` updates `error_count` and `last_error`, but `saveAccounts()` is never called after these mutations. On restart, all error counts reset and disabled accounts re-enable.

**Fix**: Persist after error threshold changes. For `last_used`, periodic or debounced saves to avoid excessive I/O.

---

## Wave 2: Code Quality & Security

### 2.1 Duplicated needsSessionRefresh

**Problem**: Exists in both `AccountManager` (line 169, uses config threshold) and `GeminiBusinessAPI` (line 502, hardcodes 5 min). Only the API version is called; the AccountManager version is dead code.

**Fix**: Remove dead code from AccountManager. Keep single source in GeminiBusinessAPI, optionally make threshold configurable.

### 2.2 Hardcoded magic numbers

**Problem**: Session TTL (50min), JWT cache TTL (4.5min), refresh threshold (5min) are scattered as inline numeric expressions across index.ts and gemini-business-api.ts.

**Fix**: Extract into named constants at the top of gemini-business-api.ts.

### 2.3 Deprecated substr usage

**Problem**: `Math.random().toString(36).substr(2, 9)` in account-manager.ts:73 and gemini-business-api.ts:340. `String.prototype.substr` is deprecated.

**Fix**: Replace with `substring(2, 11)`.

### 2.4 Blocking existsSync in async method

**Problem**: `account-manager.ts:34` uses `existsSync()` inside `async loadAccounts()`, blocking the event loop.

**Fix**: Replace with `await access(ACCOUNTS_FILE)` from `fs/promises`, catching `ENOENT`.

### 2.5 Race condition on file writes

**Problem**: Concurrent requests can trigger overlapping `saveAccounts()` calls, potentially corrupting the JSON config file.

**Fix**: Add a simple write queue (promise chain) to serialize writes.

### 2.6 convertToOpenAIFormat ignores non-array responses

**Problem**: `gemini-business-api.ts:325` only handles `Array.isArray(data)`. If the API returns an object, the function silently returns empty content with no error.

**Fix**: Add handling for object responses; throw a clear error for unexpected formats.

### 2.7 Misleading field name: xsrf_token stores JWT

**Problem**: `this.account.xsrf_token = jwt` (gemini-business-api.ts:112) — the field is named `xsrf_token` in types.ts but stores a JWT. Confusing for anyone reading the code.

**Fix**: Rename to `cached_jwt` / `jwt_token` in types.ts and all references. This is a breaking change for existing config files, so add migration logic in `loadAccounts()`.

### 2.8 Outdated opencode-config-example.json

**Problem**: `examples/opencode-config-example.json` uses a format (`{ models: { ... } }`) that doesn't match the README's documented provider-based config format.

**Fix**: Update the example to match the current README format.

---

## Wave 3: Tests, UX & Polish

### 3.1 Critical test gaps

**Problem**: 20 tests exist but cover only model mapping, exports, and Chrome detection. Zero tests for:
- AccountManager (rotation strategies, error tracking, threshold disabling)
- fetch handler (the main production path)
- Streaming (handleStreamResponse, toSSEStream)
- convertToOpenAIFormat
- createJWT
- CLI commands
- Error paths

**Fix**: Add tests for AccountManager (rotation, errors, threshold) and convertToOpenAIFormat as highest priority. These are unit-testable without network calls.

### 3.2 CLI credentials in shell history

**Problem**: `add-account --manual` takes cookies as positional args, which end up in shell history (`~/.zsh_history`).

**Fix**: Add a warning in help output. Recommend env variables as the primary manual method.

### 3.3 No --version flag in CLI

**Problem**: No way to check the installed plugin version from CLI.

**Fix**: Add `version` / `--version` command that reads from package.json.

### 3.4 Noisy console.log in plugin code

**Problem**: `index.ts:63-66` and `index.ts:82` emit console.log during normal operation. The plugin pollutes the host's stdout with no way to silence it.

**Fix**: Reduce to essential messages only, or gate behind a `verbose` config option.

### 3.5 Outdated RESEARCH.md

**Problem**: `.github/RESEARCH.md` describes the old architecture with wrong endpoints. These issues were fixed in the current code, but the document still says the architecture is wrong.

**Fix**: Update or remove the outdated sections. Mark resolved issues.

### 3.6 passWithNoTests masks missing tests

**Problem**: `vitest.config.ts` has `passWithNoTests: true`. If all test files are accidentally deleted, CI stays green.

**Fix**: Remove `passWithNoTests: true`.

---

## Out of Scope

- Major architecture changes (e.g., switching to a proxy-based approach)
- Adding new features (new models, new auth methods)
- Rewriting the browser-auth flow
- Changing the OpenCode plugin API contract

## Success Criteria

- All 4 critical bugs fixed
- All 8 code quality issues addressed
- AccountManager and convertToOpenAIFormat covered by tests
- All existing 20 tests still pass
- TypeScript compiles with zero errors
