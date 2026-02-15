# Deployment Guide

Quick guide to deploy opencode-gemini-business to NPM via GitHub Actions.

## Prerequisites

- [x] GitHub repository created: https://github.com/izzzzzi/opencode-gemini-business
- [x] NPM account with publish access
- [x] NPM token ready: `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`

## Step-by-Step Deployment

### 1. Push Code to GitHub

```bash
cd /Users/apple/Desktop/opencode-gemini-business

# Initialize git (if not already)
git init

# Add all files
git add .

# Initial commit
git commit -m "feat: initial release of opencode-gemini-business

Multi-account Gemini Business pool plugin for OpenCode with:
- Account rotation (round-robin, least-used, random)
- JWT auto-refresh
- Error tracking and failover
- Complete CLI interface
- TypeScript with full types
- Comprehensive documentation"

# Add remote
git remote add origin https://github.com/izzzzzi/opencode-gemini-business.git

# Push to main
git push -u origin main
```

### 2. Configure GitHub Secrets

Go to: https://github.com/izzzzzi/opencode-gemini-business/settings/secrets/actions

**Add NPM_TOKEN:**
1. Click **New repository secret**
2. Name: `NPM_TOKEN`
3. Value: `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`
4. Click **Add secret**

### 3. Configure GitHub Actions Permissions

Go to: https://github.com/izzzzzi/opencode-gemini-business/settings/actions

**Set workflow permissions:**
1. Workflow permissions → **Read and write permissions** ✅
2. Allow GitHub Actions to create and approve pull requests ✅
3. Click **Save**

### 4. Enable Dependabot

Go to: https://github.com/izzzzzi/opencode-gemini-business/settings/security_analysis

**Enable:**
- [x] Dependabot alerts
- [x] Dependabot security updates
- [x] Dependabot version updates

### 5. Trigger First Release

The initial commit with `feat:` prefix will trigger Semantic Release:

**What will happen:**
1. ✅ GitHub Actions runs tests
2. ✅ Builds TypeScript
3. ✅ Semantic Release analyzes commits
4. ✅ Creates version 1.0.0
5. ✅ Updates CHANGELOG.md
6. ✅ Publishes to NPM
7. ✅ Creates GitHub release with tag v1.0.0

**Monitor progress:**
- https://github.com/izzzzzi/opencode-gemini-business/actions

### 6. Verify Deployment

**Check NPM:**
```bash
npm view opencode-gemini-business
```

**Test installation:**
```bash
npm install -g opencode-gemini-business
opencode-gemini-business help
```

**Check GitHub Release:**
- https://github.com/izzzzzi/opencode-gemini-business/releases

## Alternative: Manual First Publish

If you prefer to publish manually first:

```bash
# Install dependencies
npm install

# Build
npm run build

# Login to NPM
npm login

# Publish
npm publish

# Then push to GitHub
git push origin main
```

## Post-Deployment

### Update README Badges

Add badges to README.md:

```markdown
[![npm version](https://badge.fury.io/js/opencode-gemini-business.svg)](https://badge.fury.io/js/opencode-gemini-business)
[![CI/CD](https://github.com/izzzzzi/opencode-gemini-business/workflows/CI%2FCD/badge.svg)](https://github.com/izzzzzi/opencode-gemini-business/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### Create Discussions

Enable GitHub Discussions:
- https://github.com/izzzzzi/opencode-gemini-business/settings
- Features → Discussions ✅

### Add Topics

Add repository topics:
- opencode
- gemini
- google-ai
- multi-account
- typescript
- plugin
- ai
- llm

## Future Releases

All future releases are automated via Semantic Release:

```bash
# Feature (minor release)
git commit -m "feat(accounts): add batch import"
git push

# Bug fix (patch release)
git commit -m "fix(jwt): handle edge case"
git push

# Breaking change (major release)
git commit -m "feat(api)!: restructure config format

BREAKING CHANGE: Configuration file format changed"
git push
```

## Monitoring

### GitHub Actions
- https://github.com/izzzzzi/opencode-gemini-business/actions

### NPM Package
- https://www.npmjs.com/package/opencode-gemini-business

### Dependabot PRs
- https://github.com/izzzzzi/opencode-gemini-business/pulls

## Troubleshooting

### Build Fails

**Check:**
- TypeScript compilation: `npm run lint`
- Dependencies installed: `npm ci`
- Node version: 18+

### Publish Fails

**Check:**
- NPM token in GitHub Secrets
- Token not expired: `npm token list`
- Package name available: `npm view opencode-gemini-business`

### Semantic Release Issues

**Check:**
- Commit message format
- GitHub permissions
- Workflow logs

**Debug:**
```bash
npm run semantic-release -- --dry-run
```

## Rollback

If something goes wrong:

```bash
# Revert to previous version
npm deprecate opencode-gemini-business@1.0.0 "Version deprecated"

# Publish previous version
npm publish --tag previous
```

## Support

- **Issues**: https://github.com/izzzzzi/opencode-gemini-business/issues
- **Discussions**: https://github.com/izzzzzi/opencode-gemini-business/discussions

---

**Ready to deploy!** 🚀

Follow the steps above and your plugin will be live on NPM!
