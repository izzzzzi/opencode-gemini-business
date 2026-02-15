# [2.0.0](https://github.com/izzzzzi/opencode-gemini-business/compare/v1.0.0...v2.0.0) (2026-02-15)


### Bug Fixes

* implement proper JWT authentication for Gemini Business API ([a24999a](https://github.com/izzzzzi/opencode-gemini-business/commit/a24999ac93aeb113d5ac0b788ae289e86009c66e))


### BREAKING CHANGES

* - Complete rewrite of authentication flow based on business-gemini-pool
- Now creates JWT tokens from xsrfToken and keyId (HMAC-SHA256)
- Fixed cookie header case sensitivity (__Secure-C_SES, __Host-C_OSES)
- Fixed session creation with correct body format

Changes:
- Add crypto import for HMAC JWT signing
- Implement createJWT() method for proper JWT token generation
- Rename getXSRFToken() to getJWT() to reflect actual purpose
- Update createSession() with correct body structure:
  - configId (team_id)
  - additionalParams with token placeholder
  - createSessionRequest with session name/displayName
- Use Authorization Bearer header instead of X-XSRF-Token
- Fix XSRF endpoint to use GET with ?csesidx parameter
- Handle XSS protection prefix )]}' in responses

Documentation:
- Update README examples with all supported models
- Add comprehensive model-specific usage examples
- Show configuration for gemini-pro, gemini-flash, gemini-2-pro, etc.
- Update both English and Russian documentation

Tested and working with real Gemini Business account! ✅

Based on: https://github.com/ddcat666/business-gemini-pool

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

# 1.0.0 (2026-02-15)


### Bug Fixes

* add package-lock.json and fix CLI module loading ([98cca46](https://github.com/izzzzzi/opencode-gemini-business/commit/98cca46b6cf0516db3a5abfca1f65aec23033f4c))
* allow CI to pass with no tests ([3948e26](https://github.com/izzzzzi/opencode-gemini-business/commit/3948e264b7d924a9e6495a3c4c0c305606e72282))
* configure npm registry in CI workflow ([a82d1d7](https://github.com/izzzzzi/opencode-gemini-business/commit/a82d1d794eee3589a446bc829ff7b702a1ec8c56))
* update release workflow to match opencode-hashline pattern ([e1ef4fa](https://github.com/izzzzzi/opencode-gemini-business/commit/e1ef4fa50186469dd7190c9f5f66255e89fb05b5))


### Features

* initial release of opencode-gemini-business plugin ([b24c07e](https://github.com/izzzzzi/opencode-gemini-business/commit/b24c07eb6ec407dd16d8127d062ad69b1aca8fd7))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-02-15

### Added
- Initial release of opencode-gemini-business plugin
- Multi-account management with automatic rotation
- Support for round-robin, least-used, and random rotation strategies
- Automatic JWT token refresh
- Account health monitoring and auto-disable on errors
- CLI commands for account management:
  - `add-account` - Add new Gemini Business account
  - `list-accounts` - List all configured accounts
  - `remove-account` - Remove an account
  - `test-account` - Test account credentials
- OpenCode integration for seamless model usage
- Automatic retry with account failover
- OpenAI-compatible API format
- Comprehensive documentation:
  - Configuration guide
  - Troubleshooting guide
  - API reference

### Features
- 🔄 Multi-account rotation with configurable strategies
- 🛡️ Automatic error handling and account failover
- 🔐 JWT token management with auto-refresh
- 📊 Account monitoring (usage tracking, error counting)
- 🚀 OpenAI-compatible API
- 🔧 Flexible configuration options
- 📝 Extensive CLI for account management

### Technical Details
- TypeScript implementation
- Node.js 18+ support
- ESM module format
- Vitest for testing
- GitHub Actions CI/CD

## Architecture

Based on:
- [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth)
- [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth)
- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)

Integrates:
- [business-gemini-pool](https://github.com/ddcat666/business-gemini-pool)

[Unreleased]: https://github.com/izzzzzi/opencode-gemini-business/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/izzzzzi/opencode-gemini-business/releases/tag/v1.0.0
