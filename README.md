# 🔄 opencode-gemini-business

[🇬🇧 **English**](README.md) | [🇷🇺 Русский](README.ru.md)

> Multi-account Gemini Business pool with intelligent rotation for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/opencode-gemini-business.svg)](https://www.npmjs.com/package/opencode-gemini-business)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 📖 Overview

**opencode-gemini-business** is an OpenCode plugin that enables multi-account rotation for **Gemini Business API**, providing automatic failover and load balancing across multiple accounts. Pool multiple Gemini Business accounts with intelligent rotation strategies to overcome rate limits.

**⚠️ Important**: This plugin uses the **official Gemini Business API** (`business.gemini.google`), NOT Google AI Studio.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔄 **Multi-Account Rotation** | Automatically rotate between multiple Gemini Business accounts |
| 🛡️ **Automatic Failover** | Retry failed requests with different accounts seamlessly |
| 🔐 **Session Management** | Built-in XSRF token and session lifecycle management |
| ⚙️ **Flexible Strategies** | Round-robin, least-used, or random rotation |
| 📊 **Health Monitoring** | Track usage statistics and error counts per account |
| 🚀 **OpenCode Compatible** | Works seamlessly with OpenCode's provider system |
| 💾 **Persistent Config** | Secure storage in `~/.config/opencode/gemini-business-accounts.json` |

## 🤖 Supported Models

The plugin supports all Gemini Business models:

| Model | Context Length | Max Output | Best For |
|-------|---------------|------------|----------|
| `gemini-2.5-pro` | 1M tokens | 32K tokens | Complex reasoning, long documents |
| `gemini-2.5-flash` | 1M tokens | 8K tokens | Fast responses, simple tasks |
| `gemini-2.0-pro` | 2M tokens | 32K tokens | Massive context, deep analysis |
| `gemini-1.5-pro` | 2M tokens | 8K tokens | Production workloads |
| `gemini-1.5-flash` | 1M tokens | 8K tokens | Cost-effective development |

## 🔧 Installation & Configuration

### 📦 Install the Plugin

```bash
npm install -g opencode-gemini-business
```

Or use with npx:

```bash
npx opencode-gemini-business@latest
```

### ⚙️ Configure OpenCode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-gemini-business"],
  "models": {
    "gemini-business": {
      "provider": "gemini-business",
      "model": "gemini-2.5-pro",
      "rotation_strategy": "round-robin"
    }
  }
}
```

### 🔑 Extract Credentials

#### Method 1: Using Browser Extension (RECOMMENDED) ⚡

**Use the "Get cookies.txt LOCALLY" extension** to export cookies including HttpOnly:

1. **Install Extension**:
   - [Chrome Web Store: Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - This extension can export **all cookies** including HttpOnly (which JavaScript cannot access)

2. **Login** to [Gemini Business](https://business.gemini.google)

3. **Click extension icon** → Export cookies for `business.gemini.google`

4. **Find in exported file**:
   - `__Secure-C_SES`: `CSE.xxx...`
   - `__Host-C_OSES`: `COS.xxx...`

5. **Get csesidx from URL**:
   - Look at your browser URL: `?csesidx=1370433092`
   - Copy the number after `csesidx=`

6. **Get team_id from Network tab**:
   - F12 → **Network** tab
   - Send a message to Gemini
   - Find request to `biz-discoveryengine.googleapis.com`
   - Click request → **Headers** → find `X-Goog-Team-Id: team_xxxxx`

7. **Add account** (see below)

#### Method 2: Manual Extraction via DevTools

1. **Login** to [Gemini Business](https://business.gemini.google)

2. **Open DevTools** (F12) → **Network tab**

3. **Send a message** to Gemini or refresh the page

4. **Find any request** to `biz-discoveryengine.googleapis.com`

5. **Copy from request headers**:
   - `X-Goog-Team-Id` → this is your `team_id`
   - Cookie: `__Secure-c_ses` → copy the value
   - Cookie: `__Host-c_oses` → copy the value
   - Find `csesidx` in request payload or headers

6. **Add account**:

```bash
opencode-gemini-business add-account \
  "My Account" \
  "team_abc123" \
  "secure_ses_cookie_value" \
  "host_oses_cookie_value" \
  "csesidx_value"
```

**Or use environment variables**:

```bash
export GEMINI_ACCOUNT_NAME="My Account"
export GEMINI_TEAM_ID="team_abc123"
export GEMINI_SECURE_C_SES="secure_ses_value"
export GEMINI_HOST_C_OSES="host_oses_value"
export GEMINI_CSESIDX="csesidx_value"

opencode-gemini-business add-account
```

## 🚀 Usage

### Basic Usage

```bash
# Use with specific model
opencode run "Write a hello world in Python" --model=gemini-business

# Set as default
export OPENCODE_MODEL=gemini-business
opencode run "Your task here"
```

### Model-Specific Usage

```bash
# Use Pro model for complex tasks
opencode run "Analyze this codebase architecture" --model=gemini-pro

# Use Flash model for quick tasks
opencode run "Fix this syntax error" --model=gemini-flash
```

### 🛠️ Account Management

```bash
# List all accounts
opencode-gemini-business list-accounts

# Test specific account
opencode-gemini-business test-account <account_id>

# Remove account
opencode-gemini-business remove-account <account_id>

# Show help
opencode-gemini-business help
```

## 🔄 Rotation Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `round-robin` | Cycles through accounts in order | Balanced usage across all accounts |
| `least-used` | Selects account with oldest last_used timestamp | Minimize individual account usage |
| `random` | Random probabilistic selection | Unpredictable load distribution |

**Configure strategy** in OpenCode config:

```json
{
  "models": {
    "gemini-business": {
      "provider": "gemini-business",
      "model": "gemini-2.5-pro",
      "rotation_strategy": "least-used"  // ← Change here
    }
  }
}
```


## ❓ FAQ

<details>
<summary><b>Q: How do I handle session expiration?</b></summary>

The plugin automatically refreshes sessions. Sessions are cached for 50 minutes and auto-refresh when needed. If you see "Session has expired" errors, the plugin will create a new session automatically.

</details>

<details>
<summary><b>Q: Which model should I use?</b></summary>

- **Complex tasks**: `gemini-2.5-pro` or `gemini-2.0-pro` for best reasoning
- **Quick tasks**: `gemini-2.5-flash` or `gemini-1.5-flash` for speed
- **Large contexts**: `gemini-2.0-pro` supports up to 2M tokens

</details>

<details>
<summary><b>Q: How many accounts should I add?</b></summary>

Recommended: 2-5 accounts for optimal failover and load distribution. More accounts provide better redundancy but increase configuration complexity.

</details>

<details>
<summary><b>Q: Is the credential extraction script safe?</b></summary>

**YES, 100% safe!** The script:
- ✅ Runs ONLY in your browser (locally)
- ✅ Does NOT send data to external servers
- ✅ Only reads cookies from business.gemini.google
- ✅ Open source - you can review the code

**Never** run scripts from untrusted sources. Only use from official repository.

</details>

<details>
<summary><b>Q: What's the difference from Google AI Studio?</b></summary>

This plugin uses **Gemini Business API** (`business.gemini.google`), which is:
- ✅ Enterprise/business accounts
- ✅ Higher rate limits
- ✅ Business-grade features

**NOT** Google AI Studio (`aistudio.google.com`), which is:
- ❌ Free/developer tier
- ❌ Lower rate limits
- ❌ Different API endpoints

</details>

## 🔒 Security Best Practices

### Credential Safety

```
⚠️ CRITICAL: Keep your credentials PRIVATE!

✅ DO:
- Store credentials only in ~/.config/opencode/gemini-business-accounts.json
- Use environment variables for temporary access
- Rotate credentials regularly
- Add *.json to .gitignore

❌ DON'T:
- Commit credentials to git repositories
- Share credentials with others
- Store credentials in plain text files
- Use credentials in public environments
```

### Cookie Extraction Script Safety

```
✅ The extraction script is SAFE because:
- Runs 100% locally in your browser
- NO external network requests
- NO data transmission to servers
- Open source and reviewable

⚠️ Security Tips:
- Only use from official repository
- Review code before running (it's short!)
- Never paste modified scripts
- Check browser console for any warnings
```

## 📄 License

MIT License - feel free to use this plugin!

## 💬 Need Help?

- Check the [FAQ](#-faq) above for common questions
- Test your accounts: `opencode-gemini-business test-account <account_id>`
- Report issues: [GitHub Issues](https://github.com/izzzzzi/opencode-gemini-business/issues)

---

