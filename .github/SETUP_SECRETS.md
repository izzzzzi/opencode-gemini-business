# GitHub Secrets Setup

This document explains how to set up GitHub Secrets for CI/CD automation.

## Required Secrets

### NPM_TOKEN

**Purpose**: Authenticate with NPM registry for package publishing

**Value**:
```
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
```

**How to add:**

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your NPM token
6. Click **Add secret**

### GITHUB_TOKEN

**Purpose**: Automatically provided by GitHub Actions

**Status**: ✅ No action needed - automatically available

**Usage**: Creating releases, updating CHANGELOG, managing issues

## Testing Secrets

After adding secrets, you can test them:

### Test NPM Authentication

Trigger a workflow run and check the "Verify NPM authentication" step. It should output:
```
your-npm-username
```

### Test Semantic Release

Push a commit with proper format:
```bash
git commit -m "feat: test semantic release"
git push origin main
```

Watch the GitHub Actions run. It should:
1. ✅ Run tests
2. ✅ Build project
3. ✅ Create new version
4. ✅ Update CHANGELOG
5. ✅ Publish to NPM
6. ✅ Create GitHub release

## Security Best Practices

### ✅ DO

- Store NPM token in GitHub Secrets
- Rotate tokens periodically (every 90 days)
- Use tokens with minimal required permissions
- Review token usage regularly
- Enable 2FA on NPM account

### ❌ DON'T

- Commit tokens to repository
- Share tokens in plain text
- Use admin tokens when publish-only is enough
- Store tokens in code comments
- Share tokens via email or chat

## Token Permissions

### NPM Token

**Required permissions:**
- ✅ Publish packages
- ❌ No need for admin access

**Token type:** Automation token (recommended)

### GitHub Token

**Automatic permissions:**
- ✅ Read repository contents
- ✅ Create releases
- ✅ Update files (CHANGELOG)
- ✅ Manage issues/PRs

**Note**: These are automatically granted by GitHub Actions

## Troubleshooting

### NPM Publish Fails

**Error:** `401 Unauthorized`

**Solution:**
1. Verify token is correct in GitHub Secrets
2. Check token hasn't expired
3. Ensure token has publish permissions
4. Try regenerating NPM token

**Steps:**
```bash
# Check token on NPM
npm token list

# Create new token (if needed)
npm token create

# Update GitHub Secret with new token
```

### Semantic Release Fails

**Error:** `ENOGHTOKEN`

**Solution:**
- GITHUB_TOKEN should be automatically available
- Check repository permissions in Settings
- Ensure Actions have write permissions

**Fix:**
1. Go to Settings → Actions → General
2. Workflow permissions → **Read and write permissions**
3. Save changes

## Environment Variables

### In CI/CD

```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Local Development

**⚠️ Never store tokens in `.env` files that are committed!**

For local testing:
```bash
# Create .env (ensure it's in .gitignore)
echo "NPM_TOKEN=your_token_here" > .env

# Source it
source .env

# Test
npm whoami
```

## Token Rotation

### When to Rotate

- Every 90 days (recommended)
- After team member leaves
- If token is compromised
- When moving to new CI/CD system

### How to Rotate

1. **Create new NPM token**
   ```bash
   npm token create --cidr= --read-only=false
   ```

2. **Update GitHub Secret**
   - Go to Settings → Secrets → Actions
   - Click on `NPM_TOKEN`
   - Update value
   - Save

3. **Revoke old token**
   ```bash
   npm token revoke <old_token_id>
   ```

4. **Test new token**
   - Trigger workflow run
   - Verify publish works

## Backup Plan

Keep a backup access method:

1. **Manual NPM publish**
   ```bash
   npm login
   npm publish
   ```

2. **Alternative tokens**
   - Keep one backup token for emergencies
   - Store securely (password manager)
   - Don't use unless primary fails

3. **Team access**
   - Ensure multiple team members have NPM access
   - Document recovery process

## Monitoring

### Regular Checks

- [ ] Monthly: Verify token hasn't expired
- [ ] Monthly: Check workflow runs
- [ ] Quarterly: Review token permissions
- [ ] Quarterly: Rotate token

### Audit Trail

Check token usage:
```bash
npm token list
```

Review GitHub Actions logs:
- Repository → Actions → Recent workflow runs
- Check "Semantic Release" step
- Verify successful publishes

## Additional Resources

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [NPM Token Management](https://docs.npmjs.com/about-access-tokens)
- [Semantic Release Configuration](https://semantic-release.gitbook.io/semantic-release/usage/configuration)

---

**Last Updated**: 2026-02-15
**Security Level**: High
**Review Frequency**: Monthly
