## Context

Adding a Gemini Business account today requires manually extracting 5 values (cookies, team_id, csesidx, user_agent) from browser DevTools and passing them as CLI arguments. This is the primary friction point for new users.

The plugin already has a CLI (`cli.ts`) with an `add-account` command that accepts positional arguments and env vars. The new browser flow will become the default path for `add-account`, with the existing manual flow preserved via `--manual`.

Key constraints:
- The plugin is lightweight (~3 dependencies). New dependencies must be minimal.
- Users run this as an npm-installed CLI tool on macOS, Linux, and Windows.
- Credentials needed: `__Secure-C_SES`, `__Host-C_OSES` (cookies), `csesidx` (query param), `team_id` (request body as `configId`).

## Goals / Non-Goals

**Goals:**
- One-command account setup: `opencode-gemini-business add-account`
- Zero manual copying of cookies or tokens
- Automatic extraction of all 4 required credential values
- Cross-platform Chrome detection (macOS, Linux, Windows)
- Clean browser profile per login (important for multi-account)

**Non-Goals:**
- Supporting browsers other than Chrome/Chromium
- Bundling a browser binary with the package
- Automating the Google login itself (user authenticates manually)
- Persisting browser profiles between `add-account` runs
- Headless mode (user must see the browser to log in)

## Decisions

### 1. puppeteer-core + chrome-launcher over alternatives

**Choice**: `puppeteer-core` for CDP communication, `chrome-launcher` for finding system Chrome.

**Alternatives considered**:
- `puppeteer` (full): Bundles Chromium (~280 MB) — unacceptable for a CLI plugin
- `playwright`: Requires separate `npx playwright install chromium` step — worse DX
- Raw CDP via `ws`: Too low-level, would reimplement puppeteer's cookie/request API
- `selenium-webdriver`: Heavy, requires separate driver binary

**Rationale**: `puppeteer-core` (~2 MB) + `chrome-launcher` (~50 KB) gives us a mature CDP API with zero browser download. Nearly all users have Chrome installed.

### 2. Network request interception for csesidx and team_id

**Choice**: Use `page.on('request')` to intercept outgoing requests.

```
┌─────────────────────────────────────────────────────────────┐
│  Request Interception Strategy                               │
│                                                              │
│  GET /auth/getoxsrf?csesidx=42                              │
│       └──────────────────────► Extract csesidx from URL     │
│                                                              │
│  POST widgetCreateSession                                    │
│       body: { configId: "abc-def-123" }                      │
│       └──────────────────────► Extract team_id from body    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Alternatives considered**:
- DOM scraping (`page.evaluate`): Fragile, depends on Gemini Business UI internals
- localStorage inspection: No guarantee these values are stored there
- Asking user to type them: Defeats the purpose

**Rationale**: These requests are part of the Gemini Business protocol — they are the same endpoints our plugin uses. They are stable API contracts, not UI internals.

### 3. Detection flow: cookies first, then wait for network activity

**Choice**: Two-phase detection.

```
  Phase 1: Cookie Monitoring (login detection)
  ┌──────────────────────────────────────────┐
  │  Poll page.cookies() every 2 seconds     │
  │  Looking for: __Secure-C_SES cookie      │
  │  Found → User has logged in              │
  │  Also extract: __Host-C_OSES             │
  └──────────────────────────────────────────┘
              │
              ▼
  Phase 2: Request Interception (credential capture)
  ┌──────────────────────────────────────────┐
  │  page.on('request') already listening    │
  │  Prompt user: "Send any message in chat" │
  │  Wait for getoxsrf → csesidx             │
  │  Wait for widgetCreateSession → team_id  │
  │  Both captured → Done                    │
  └──────────────────────────────────────────┘
              │
              ▼
  Phase 3: Completion
  ┌──────────────────────────────────────────┐
  │  Close browser                           │
  │  Save account via AccountManager         │
  │  Auto-create auth record                 │
  │  Print success message                   │
  └──────────────────────────────────────────┘
```

**Rationale**: Separating login detection (cookies) from credential capture (network) gives clear user feedback. We can tell the user "Logged in! Now send a message..." instead of a vague "waiting...".

### 4. New module: src/browser-auth.ts

**Choice**: Create a new dedicated module rather than extending `cli.ts`.

**Structure**:
- `src/browser-auth.ts` — `BrowserAuth` class with `captureCredentials()` method
- Returns `{ cookies, csesidx, team_id, user_agent }` or throws on failure/timeout
- `cli.ts` — Updated `addAccountCommand()` calls `BrowserAuth` by default, `--manual` skips it

**Rationale**: Keeps browser automation concerns isolated from CLI orchestration and account management.

### 5. Graceful Chrome-not-found handling

**Choice**: Descriptive error with install link, no automatic browser download.

```
❌ Google Chrome not found on this system.

  Install Chrome: https://www.google.com/chrome/

  Or add an account manually:
    opencode-gemini-business add-account --manual <name> <team_id> ...
```

**Rationale**: Automatically downloading Chrome would be surprising behavior for a CLI tool. The error message provides both options: install Chrome or use manual mode.

### 6. Timeout and error handling

| Scenario | Behavior |
|----------|----------|
| Chrome not found | Error with install link + manual fallback |
| User closes browser before login | Error: "Browser closed before login completed" |
| Login detected but no chat activity within 5 min | Prompt reminder in CLI, continue waiting |
| Overall timeout (10 min) | Error: "Timeout — try again or use --manual" |
| Network interception fails to capture both values | Error with which value is missing |

## Risks / Trade-offs

- **[Risk] Chrome updates change cookie names or request format** → Mitigation: These are stable API contracts (same ones our plugin uses daily). If they change, the plugin itself breaks, not just the auth flow.
- **[Risk] User has Chromium but not Chrome** → Mitigation: `chrome-launcher` detects both Chrome and Chromium.
- **[Risk] Corporate environments block Chrome launch** → Mitigation: `--manual` flag always available as fallback.
- **[Risk] 2FA adds extra steps** → Mitigation: User completes 2FA normally in the browser. No impact on the flow — we just wait longer for cookies.
- **[Trade-off] Requires user to send a message in chat** → Acceptable: This is a one-time setup action. The alternative (DOM scraping) is fragile.
- **[Trade-off] puppeteer-core as new dependency** → Acceptable: ~2 MB, well-maintained by Google, no Chromium bundled.
