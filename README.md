# OpenCode Gemini Business Plugin

Multi-account Gemini Business pool with automatic rotation for OpenCode.

## Features

- 🔄 **Multi-Account Rotation**: Automatically rotate between multiple Gemini Business accounts
- 🛡️ **Error Handling**: Automatic retry with account failover
- 🔐 **JWT Management**: Automatic JWT token refresh
- ⚙️ **Flexible Configuration**: Round-robin, least-used, or random rotation strategies
- 📊 **Account Monitoring**: Track usage, errors, and account health
- 🚀 **OpenAI-Compatible API**: Works seamlessly with OpenCode

## Installation

```bash
npm install -g opencode-gemini-business
```

Or use with npx:

```bash
npx opencode-gemini-business@latest
```

## Configuration

### Add Your First Account

You need to extract credentials from your Gemini Business account:

1. Login to [Google AI Studio](https://aistudio.google.com) with your business account
2. Open browser DevTools (F12) → Network tab
3. Make any API request
4. Find the request headers and copy:
   - `team_id` (from X-Goog-Team-Id header)
   - `__Secure-c_ses` cookie
   - `__Host-c_oses` cookie
   - `csesidx` value

Then add the account:

```bash
opencode-gemini-business add-account \
  "My Account" \
  "team_abc123" \
  "secure_ses_cookie_value" \
  "host_oses_cookie_value" \
  "csesidx_value"
```

Or use environment variables:

```bash
export GEMINI_ACCOUNT_NAME="My Account"
export GEMINI_TEAM_ID="team_abc123"
export GEMINI_SECURE_C_SES="secure_ses_cookie_value"
export GEMINI_HOST_C_OSES="host_oses_cookie_value"
export GEMINI_CSESIDX="csesidx_value"

opencode-gemini-business add-account
```

### Configure OpenCode

Add the plugin to your `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-gemini-business@latest"],
  "models": {
    "gemini-business": {
      "provider": "opencode-gemini-business",
      "model": "gemini-2.5-pro",
      "rotation_strategy": "round-robin"
    }
  }
}
```

## Usage

### CLI Commands

```bash
# Add account
opencode-gemini-business add-account <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx>

# List accounts
opencode-gemini-business list-accounts

# Test account
opencode-gemini-business test-account <account_id>

# Remove account
opencode-gemini-business remove-account <account_id>

# Help
opencode-gemini-business help
```

### With OpenCode

```bash
# Use with OpenCode
opencode run "Write a hello world in Python" --model=gemini-business

# Or set as default model
export OPENCODE_MODEL=gemini-business
opencode run "Your task here"
```

## Configuration File

Accounts are stored in `~/.config/opencode/gemini-business-accounts.json`:

```json
{
  "accounts": [
    {
      "id": "account-1234567890-abc123",
      "name": "My Account",
      "team_id": "team_abc123",
      "cookies": {
        "secure_c_ses": "...",
        "host_c_oses": "..."
      },
      "csesidx": "...",
      "enabled": true,
      "error_count": 0
    }
  ],
  "rotation_strategy": "round-robin",
  "max_retries": 3,
  "error_threshold": 3
}
```

## Rotation Strategies

- **round-robin** (default): Rotate through accounts in order
- **least-used**: Use the account with the oldest last_used timestamp
- **random**: Randomly select an account

## Error Handling

The plugin automatically:
- Retries failed requests with different accounts
- Disables accounts after reaching error threshold (default: 3 consecutive errors)
- Refreshes JWT tokens when needed
- Re-enables accounts when they succeed again

## Architecture

Based on the structure of:
- [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth)
- [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth)
- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)

Integrates with:
- [business-gemini-pool](https://github.com/ddcat666/business-gemini-pool)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

If you encounter any issues, please:
1. Check the account configuration
2. Test accounts with `test-account` command
3. Check logs for error details
4. Open an issue on GitHub
