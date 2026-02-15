# Troubleshooting Guide

## Common Issues

### 1. No Accounts Configured

**Error:**
```
No Gemini Business accounts configured. Please add accounts using:
opencode-gemini-business add-account
```

**Solution:**
```bash
# Add at least one account
opencode-gemini-business add-account \
  "Account Name" \
  "team_id" \
  "secure_c_ses" \
  "host_c_oses" \
  "csesidx"
```

### 2. All Accounts Disabled

**Error:**
```
No available accounts. All accounts may be disabled due to errors.
```

**Causes:**
- All accounts have reached error threshold
- All accounts have invalid credentials
- Network issues

**Solution:**
```bash
# List accounts to see status
opencode-gemini-business list-accounts

# Test each account
opencode-gemini-business test-account <account_id>

# Fix credentials and re-enable in config
# Edit ~/.config/opencode/gemini-business-accounts.json
# Set "enabled": true for fixed accounts
```

### 3. JWT Refresh Failed

**Error:**
```
JWT refresh failed: 401 Unauthorized
```

**Causes:**
- Expired cookies
- Invalid team_id
- Session invalidated on Google's side

**Solution:**
1. Re-extract credentials from browser
2. Update account with new credentials
3. Test the account

```bash
# Remove old account
opencode-gemini-business remove-account <account_id>

# Add with new credentials
opencode-gemini-business add-account <new_credentials>
```

### 4. Account Test Fails

**Error:**
```
❌ Account test failed!
   Error: Connection refused
```

**Common Causes:**

#### Network Issues
- Check internet connection
- Check firewall settings
- Try from different network

#### Invalid Credentials
```bash
# Verify each credential:
# - team_id format: "team_" followed by alphanumeric
# - cookies should be long strings
# - csesidx should match the session
```

#### Expired Cookies
Cookies typically expire after:
- 30 days of inactivity
- Explicit logout
- Password change

**Solution:** Re-extract from browser

### 5. Rate Limiting

**Error:**
```
Request failed: 429 Too Many Requests
```

**Solution:**
The plugin should automatically rotate to the next account. If you see this:

1. Add more accounts for better distribution
2. Check if all accounts are hitting limits
3. Wait for quota reset (usually hourly/daily)

### 6. OpenCode Integration Issues

#### Plugin Not Found

**Error:**
```
Plugin 'opencode-gemini-business' not found
```

**Solution:**
```bash
# Install globally
npm install -g opencode-gemini-business

# Or use npx
npx opencode-gemini-business@latest
```

#### Model Not Available

**Error:**
```
Model 'gemini-business' not found
```

**Solution:**
Check your `~/.config/opencode/opencode.json`:
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

### 7. Streaming Response Issues

**Error:**
```
Failed to parse SSE data
```

**Causes:**
- Network interruption
- Malformed server response
- Timeout

**Solution:**
- Retry the request (automatic with rotation)
- Check network stability
- Try non-streaming mode (if supported)

### 8. TypeScript Compilation Errors

If you're developing and see TypeScript errors:

```bash
# Install type definitions
npm install --save-dev @types/node

# Rebuild
npm run build
```

## Debugging

### Enable Debug Mode

Set environment variable:
```bash
export OPENCODE_GEMINI_DEBUG=true
```

This will output:
- Account selection process
- JWT refresh attempts
- Request/response details
- Error stack traces

### Check Account Status

```bash
# List all accounts with detailed status
opencode-gemini-business list-accounts

# Example output:
# [1] Production Account (account-123...)
#     Team ID: team_abc123
#     Status: ✅ Enabled
#     Errors: 0
#     Last Used: 2026-02-15T10:30:00.000Z
```

### Test Individual Accounts

```bash
# Test specific account
opencode-gemini-business test-account account-123...

# Expected output on success:
# ✅ Account test successful!
#    Connection: OK
#    Authentication: OK
```

### Verify Configuration

```bash
# Check config file exists
ls -la ~/.config/opencode/gemini-business-accounts.json

# View config
cat ~/.config/opencode/gemini-business-accounts.json | jq .
```

## Advanced Troubleshooting

### Network Diagnostics

```bash
# Test connectivity to Google AI Studio
curl -I https://aistudio.google.com

# Test with account credentials
curl -H "Authorization: Bearer <jwt_token>" \
     -H "X-Goog-Team-Id: <team_id>" \
     https://aistudio.google.com/api/v1/models
```

### Logs Location

Logs are output to stderr. To save logs:

```bash
opencode run "task" --model=gemini-business 2> debug.log
```

### Common Log Messages

| Message | Meaning | Action |
|---------|---------|--------|
| `Loaded N accounts` | Accounts loaded successfully | None needed |
| `Refreshing JWT for account...` | JWT token being renewed | Normal operation |
| `Account disabled after N errors` | Error threshold reached | Check account credentials |
| `No enabled accounts available` | All accounts disabled | Re-enable accounts |
| `Retrying in Xms...` | Automatic retry in progress | Wait for completion |

## Getting Help

If you can't resolve the issue:

1. **Gather Information:**
   ```bash
   # Account status
   opencode-gemini-business list-accounts > accounts.txt

   # Test results
   opencode-gemini-business test-account <id> > test.txt 2>&1

   # Config (remove sensitive data!)
   cat ~/.config/opencode/gemini-business-accounts.json | jq 'del(.accounts[].cookies)' > config.txt
   ```

2. **Open an Issue:**
   - Go to GitHub repository
   - Include gathered information (WITHOUT sensitive credentials)
   - Describe steps to reproduce
   - Include error messages

3. **Check Existing Issues:**
   - Search for similar problems
   - Check closed issues for solutions

## FAQ

### Q: How often do I need to refresh credentials?

A: Cookies typically last 30 days. JWT tokens are automatically refreshed by the plugin.

### Q: Can I use free Gemini accounts?

A: This plugin is designed for Gemini Business/Enterprise accounts with team_id. Free accounts use a different authentication method.

### Q: How many accounts should I add?

A: Depends on your usage:
- Light usage: 1-2 accounts
- Medium usage: 3-5 accounts
- Heavy usage: 5+ accounts

### Q: Will this work with Vertex AI?

A: No, this is specifically for Google AI Studio Business accounts. Vertex AI uses different authentication.

### Q: Is this officially supported by Google?

A: No, this is a community plugin. Use at your own risk and follow Google's Terms of Service.
