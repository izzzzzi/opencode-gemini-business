# Getting Started

This guide will help you set up and start using OpenCode Gemini Business plugin.

## Prerequisites

- Node.js 18 or higher
- OpenCode CLI installed
- Google Business account with access to Gemini Business API
- Access to Google AI Studio (aistudio.google.com)

## Installation

### Option 1: Global Installation (Recommended)

```bash
npm install -g opencode-gemini-business
```

### Option 2: Use with npx

```bash
npx opencode-gemini-business@latest
```

### Option 3: Local Installation

```bash
npm install opencode-gemini-business
```

## Quick Start

### Step 1: Extract Credentials

You need to extract credentials from your Google AI Studio account:

1. **Open Google AI Studio**
   - Go to https://aistudio.google.com
   - Login with your Business account

2. **Open Browser DevTools**
   - Press `F12` or Right-click → Inspect
   - Navigate to the **Network** tab

3. **Capture API Request**
   - Send any prompt or interact with the UI
   - Look for requests to `aistudio.google.com`
   - Click on one of these requests

4. **Extract Required Data**

   From the **Headers** tab, copy:

   | Field | Location | Example |
   |-------|----------|---------|
   | `team_id` | Request Headers → `X-Goog-Team-Id` | `team_abc123def456` |
   | `secure_c_ses` | Cookie header → `__Secure-c_ses=...` | Long cookie string |
   | `host_c_oses` | Cookie header → `__Host-c_oses=...` | Another long string |
   | `csesidx` | Look in cookies or request payload | `idx_xyz789` |

   **Example Cookie Header:**
   ```
   Cookie: __Secure-c_ses=ABC123...; __Host-c_oses=XYZ789...; other_cookies=...
   ```

### Step 2: Add Your First Account

Using command line:

```bash
opencode-gemini-business add-account \
  "My Production Account" \
  "team_abc123def456" \
  "YOUR_SECURE_C_SES_VALUE" \
  "YOUR_HOST_C_OSES_VALUE" \
  "YOUR_CSESIDX_VALUE"
```

Or using environment variables:

```bash
export GEMINI_ACCOUNT_NAME="My Production Account"
export GEMINI_TEAM_ID="team_abc123def456"
export GEMINI_SECURE_C_SES="YOUR_SECURE_C_SES_VALUE"
export GEMINI_HOST_C_OSES="YOUR_HOST_C_OSES_VALUE"
export GEMINI_CSESIDX="YOUR_CSESIDX_VALUE"

opencode-gemini-business add-account
```

**Expected Output:**
```
✅ Account added successfully! ID: account-1708012345678-abc123
   Name: My Production Account
   Team ID: team_abc123def456
```

### Step 3: Test Your Account

Verify your account works:

```bash
opencode-gemini-business test-account account-1708012345678-abc123
```

**Expected Output:**
```
Testing account: My Production Account (account-1708012345678-abc123)
Please wait...

✅ Account test successful!
   Connection: OK
   Authentication: OK
```

### Step 4: Configure OpenCode

Edit your OpenCode configuration file at `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-gemini-business@latest"],
  "models": {
    "gemini-business": {
      "provider": "opencode-gemini-business",
      "model": "gemini-2.5-pro"
    }
  }
}
```

### Step 5: Use with OpenCode

Now you can use Gemini Business with OpenCode:

```bash
opencode run "Write a hello world program in Python" --model=gemini-business
```

Or set it as the default model:

```bash
export OPENCODE_MODEL=gemini-business
opencode run "Your task here"
```

## Adding More Accounts

For better reliability and higher quotas, add multiple accounts:

```bash
# Add second account
opencode-gemini-business add-account \
  "Development Account" \
  "team_def456" \
  "second_secure_c_ses" \
  "second_host_c_oses" \
  "second_csesidx"

# Add third account
opencode-gemini-business add-account \
  "Testing Account" \
  "team_ghi789" \
  "third_secure_c_ses" \
  "third_host_c_oses" \
  "third_csesidx"
```

Verify all accounts:

```bash
opencode-gemini-business list-accounts
```

## Configuration

The plugin stores configuration at:
```
~/.config/opencode/gemini-business-accounts.json
```

You can manually edit this file to:
- Change rotation strategy
- Adjust retry settings
- Enable/disable accounts
- Update credentials

Example configuration:

```json
{
  "accounts": [
    {
      "id": "account-...",
      "name": "Production",
      "team_id": "team_...",
      "cookies": {
        "secure_c_ses": "...",
        "host_c_oses": "..."
      },
      "csesidx": "...",
      "enabled": true
    }
  ],
  "rotation_strategy": "round-robin",
  "max_retries": 3,
  "error_threshold": 3
}
```

## Available Models

Common Gemini Business models:
- `gemini-2.5-pro` - Most capable model
- `gemini-2.5-flash` - Fast, efficient model
- `gemini-2.5-pro-thinking` - Extended thinking model

Configure multiple models in OpenCode:

```json
{
  "models": {
    "gemini-pro": {
      "provider": "opencode-gemini-business",
      "model": "gemini-2.5-pro",
      "temperature": 0.7
    },
    "gemini-flash": {
      "provider": "opencode-gemini-business",
      "model": "gemini-2.5-flash",
      "temperature": 0.3
    }
  }
}
```

## Common Commands

```bash
# Add account
opencode-gemini-business add-account <name> <team_id> <ses> <oses> <csesidx>

# List all accounts
opencode-gemini-business list-accounts

# Test account
opencode-gemini-business test-account <account_id>

# Remove account
opencode-gemini-business remove-account <account_id>

# Help
opencode-gemini-business help
```

## Troubleshooting

### Account Test Fails

If `test-account` fails:

1. **Check credentials are correct**
   - Re-extract from browser
   - Ensure no extra spaces or characters

2. **Verify cookies haven't expired**
   - Cookies typically last 30 days
   - Re-login to Google AI Studio
   - Extract fresh cookies

3. **Check team_id format**
   - Should start with `team_`
   - Followed by alphanumeric characters

### No Accounts Available

If you see: `No available accounts`:

1. Check all accounts aren't disabled:
   ```bash
   opencode-gemini-business list-accounts
   ```

2. Test each disabled account
3. Update credentials for failed accounts
4. Manually enable in config file

### Rate Limiting

The plugin automatically rotates to the next account when hitting rate limits. To reduce rate limit issues:

1. Add more accounts
2. Check account quotas in Google AI Studio
3. Adjust rotation strategy to `least-used`

## Next Steps

- Read the [Configuration Guide](./CONFIGURATION.md) for advanced options
- Check [Troubleshooting Guide](./TROUBLESHOOTING.md) if you encounter issues
- Review [API Reference](./API.md) for programmatic usage
- Explore [Architecture](./ARCHITECTURE.md) to understand how it works

## Support

- GitHub Issues: https://github.com/izzzzzi/opencode-gemini-business/issues
- Documentation: https://github.com/izzzzzi/opencode-gemini-business

## Tips

1. **Security**: Never commit `gemini-business-accounts.json` to version control
2. **Backups**: Keep a backup of your credentials in a secure location
3. **Monitoring**: Regularly check `list-accounts` to monitor account health
4. **Updates**: Update credentials when they expire (typically every 30 days)
5. **Multiple Accounts**: Use 3-5 accounts for production workloads
