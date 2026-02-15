# opencode-gemini-business

[English](README.md) | [Русский](README.ru.md)

> Multi-account Gemini Business pool with intelligent rotation for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/opencode-gemini-business.svg)](https://www.npmjs.com/package/opencode-gemini-business)

---

## Overview

**opencode-gemini-business** is an OpenCode plugin that enables multi-account rotation for **Gemini Business API** (`business.gemini.google`), providing automatic failover and load balancing across multiple accounts.

**Important**: This plugin uses the **Gemini Business / Enterprise API**, NOT Google AI Studio.

## Supported Models

| Model | Internal ID | Best For |
|-------|------------|----------|
| `gemini-2.5-flash` | gemini-2.5-flash | Everyday tasks, fast responses |
| `gemini-2.5-pro` | gemini-2.5-pro | Complex reasoning |
| `gemini-3-flash` | gemini-3-flash-preview | Next-gen fast model |
| `gemini-3-pro` | gemini-3-pro | Next-gen reasoning |

## Quick Start

### Step 1: Configure OpenCode

Add to `~/.config/opencode/opencode.json`:

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
        "gemini-3-pro": { "name": "Gemini 3 Pro" }
      }
    }
  }
}
```

### Step 2: Add Gemini Business account

Install the CLI tool:

```bash
npm install -g opencode-gemini-business
```

Then add your account:

```bash
opencode-gemini-business add-account \
  "My Account" \
  "e1f353e7-0291-44cf-9085-e0b6efd20e41" \
  "CSE.AXUaAj_MKeqeFLr_..." \
  "COS.AfQtEyCcW1aLwKb3..." \
  "1370433092"
```

Arguments:
1. Account name
2. `team_id` — UUID from URL `/cid/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/`
3. `__Secure-C_SES` cookie value
4. `__Host-C_OSES` cookie value
5. `csesidx` — number from URL `?csesidx=...`

Or use environment variables:

```bash
export GEMINI_ACCOUNT_NAME="My Account"
export GEMINI_TEAM_ID="e1f353e7-0291-44cf-9085-e0b6efd20e41"
export GEMINI_SECURE_C_SES="CSE.AXUaAj_MKeqeFLr_..."
export GEMINI_HOST_C_OSES="COS.AfQtEyCcW1aLwKb3..."
export GEMINI_CSESIDX="1370433092"

opencode-gemini-business add-account
```

### Step 3: Use it

```bash
# Flash model (fast)
opencode run --model=gemini-business/gemini-2.5-flash "Fix this bug"

# Pro model (best quality)
opencode run --model=gemini-business/gemini-2.5-pro "Design architecture"

# Next-gen models
opencode run --model=gemini-business/gemini-3-flash "Quick task"
opencode run --model=gemini-business/gemini-3-pro "Complex reasoning"
```

Set as default model in `opencode.json`:

```json
{
  "model": "gemini-business/gemini-2.5-flash"
}
```

## Extracting Credentials

### Where to find each value

Login to [business.gemini.google](https://business.gemini.google) and look at the URL:

```
https://business.gemini.google/home/cid/e1f353e7-0291-44cf-9085-e0b6efd20e41/r/session/123?csesidx=1370433092
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                  ^^^^^^^^^^
                                        team_id (UUID after /cid/)                            csesidx
```

### Cookies

**Method 1: Browser Extension (Recommended)**

1. Install [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Open `business.gemini.google` and export cookies
3. Find `__Secure-C_SES` (starts with `CSE.`) and `__Host-C_OSES` (starts with `COS.`)

**Method 2: DevTools**

1. Open DevTools (F12) → **Application** → **Cookies** → `https://business.gemini.google`
2. Copy `__Secure-C_SES` and `__Host-C_OSES` values

## Account Management

```bash
# List all accounts
opencode-gemini-business list-accounts

# Test account connectivity
opencode-gemini-business test-account <account_id>

# Remove account
opencode-gemini-business remove-account <account_id>

# Help
opencode-gemini-business help
```

## Rotation Strategies

| Strategy | Behavior |
|----------|----------|
| `round-robin` (default) | Cycles through accounts in order |
| `least-used` | Selects least recently used account |
| `random` | Random selection |

Configure in `~/.config/opencode/gemini-business-accounts.json` (auto-created on first `add-account`).

## How It Works

1. Plugin registers as an OpenCode auth provider for `gemini-business`
2. When a request comes in, `loader()` returns a custom `fetch()` function
3. Custom `fetch()` intercepts the request from `@ai-sdk/openai-compatible`
4. Instead of calling `baseURL/chat/completions`, it:
   - Picks an account via rotation strategy
   - Gets a JWT token from XSRF endpoint
   - Creates a session via `widgetCreateSession`
   - Sends the actual request to `widgetStreamAssist`
   - Converts the response back to OpenAI-compatible format
5. Supports both streaming (SSE) and non-streaming responses

## FAQ

<details>
<summary><b>Q: Where do I find team_id?</b></summary>

Look at the URL in your browser: `https://business.gemini.google/home/cid/e1f353e7-0291-44cf-9085-e0b6efd20e41/...`

The UUID after `/cid/` is your `team_id`.
</details>

<details>
<summary><b>Q: Do I need to run `opencode auth login`?</b></summary>

No. The `add-account` command automatically creates the auth record in `~/.local/share/opencode/auth.json`. If for some reason it wasn't created, you can run `opencode auth login`, select **gemini-business**, and enter any key (e.g. `unused`).
</details>

<details>
<summary><b>Q: Session expired errors?</b></summary>

The plugin automatically refreshes sessions (cached for 50 minutes). If you see persistent errors, your cookies may have expired — re-extract them from the browser.
</details>

<details>
<summary><b>Q: Difference from Google AI Studio?</b></summary>

This plugin uses **Gemini Business API** (`business.gemini.google`) — enterprise accounts with higher rate limits. NOT Google AI Studio (`aistudio.google.com`).
</details>

## Security

- Credentials are stored locally in `~/.config/opencode/gemini-business-accounts.json`
- Never commit credentials to git
- Rotate cookies regularly
- The plugin does not send credentials to any third-party services

## License

MIT
