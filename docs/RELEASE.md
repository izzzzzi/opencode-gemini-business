# Release Process

This project uses **Semantic Release** for automated versioning and publishing.

## Overview

Releases are automatically created based on commit messages following the [Angular Commit Message Convention](https://github.com/angular/angular/docs/CONTRIBUTING.md#-commit-message-format).

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Release Type |
|------|-------------|--------------|
| `feat` | New feature | Minor (0.x.0) |
| `fix` | Bug fix | Patch (0.0.x) |
| `perf` | Performance improvement | Patch (0.0.x) |
| `refactor` | Code refactoring | Patch (0.0.x) |
| `revert` | Revert previous commit | Patch (0.0.x) |
| `docs` | Documentation only | No release |
| `style` | Code style changes | No release |
| `test` | Adding tests | No release |
| `build` | Build system changes | No release |
| `ci` | CI configuration changes | No release |
| `chore` | Other changes | No release |

### Breaking Changes

To trigger a **major version** release (x.0.0), include `BREAKING CHANGE:` in the commit footer:

```
feat(api): change authentication method

BREAKING CHANGE: The authentication method has changed from cookies to OAuth2.
Users must re-authenticate their accounts.
```

Or use the `!` syntax:

```
feat!: drop support for Node.js 16
```

## Examples

### Feature (Minor Release)

```
feat(account): add support for custom user agents

Allow users to specify custom user agents for each account to improve
compatibility with different API versions.
```

**Result:** Version bump from 1.2.3 → 1.3.0

### Bug Fix (Patch Release)

```
fix(jwt): handle JWT expiration edge case

Fixed an issue where JWT tokens could be used after expiration
due to timezone differences.
```

**Result:** Version bump from 1.2.3 → 1.2.4

### Breaking Change (Major Release)

```
feat(config)!: restructure configuration file format

BREAKING CHANGE: The configuration file format has been updated.
Old configs must be migrated manually.

Migration guide:
- Rename `accounts` to `accountPool`
- Move `rotation_strategy` under `pool` object
```

**Result:** Version bump from 1.2.3 → 2.0.0

### Multiple Changes

```
feat(rotation): add weighted rotation strategy
fix(error): improve error messages for auth failures
docs: update configuration guide
```

**Result:** Version bump from 1.2.3 → 1.3.0 (minor takes precedence)

## Release Workflow

### Automatic Release (Recommended)

1. **Make changes** and commit with proper format
2. **Push to main** or create PR to main
3. **CI/CD runs** tests and linting
4. **Semantic Release** analyzes commits
5. **Version is determined** based on commit types
6. **CHANGELOG.md** is updated automatically
7. **New tag** is created
8. **Package is published** to NPM
9. **GitHub Release** is created

### Manual Release (Emergency)

If automatic release fails:

```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Run semantic release locally
npm run semantic-release
```

## Branch Strategy

### Main Branch

- **Purpose**: Production releases
- **Releases**: Full releases (e.g., 1.2.3)
- **Protection**: Requires PR approval, passing tests

### Develop Branch

- **Purpose**: Pre-releases and testing
- **Releases**: Beta releases (e.g., 1.3.0-beta.1)
- **Protection**: Requires passing tests

### Feature Branches

- **Purpose**: Development work
- **Naming**: `feat/description`, `fix/description`
- **Merge to**: develop → main

## NPM Configuration

### Authentication

The project uses an NPM token configured in GitHub Actions:

```
NPM_TOKEN=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
```

**⚠️ Never commit NPM tokens to the repository!**

### .npmrc File

The `.npmrc` file is configured to use the NPM_TOKEN environment variable:

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
registry=https://registry.npmjs.org/
always-auth=true
```

## Dependabot Integration

### Automatic Updates

Dependabot automatically:
- Checks for dependency updates weekly (Mondays 09:00 UTC)
- Creates PRs for updates
- Groups related dependencies
- Labels PRs appropriately

### Auto-Merge Policy

- **Minor & Patch Updates**: Auto-approved and merged
- **Major Updates**: Require manual review

## GitHub Actions

### CI/CD Pipeline

**Triggered on:**
- Push to main or develop
- Pull requests to main or develop

**Steps:**
1. Run tests on Node.js 18, 20, 22
2. Run linter
3. Build TypeScript
4. Run semantic-release (main/develop only)

### Dependabot Auto-Merge

**Triggered on:**
- Dependabot PRs

**Actions:**
- Auto-approve minor/patch updates
- Enable auto-merge
- Comment on major updates

## Troubleshooting

### Release Not Triggered

**Issue**: Semantic Release didn't create a release

**Solution:**
```bash
# Check commit messages
git log --oneline

# Run semantic release in dry-run mode
npx semantic-release --dry-run
```

## Resources

- [Semantic Release](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [NPM Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)
