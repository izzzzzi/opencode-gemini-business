# [2.3.0](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.2.0...v2.3.0) (2026-04-13)


### Bug Fixes

* add write mutex to prevent concurrent file corruption ([68293bc](https://github.com/izzzzzi/opencode-gemini-business/commit/68293bc6603f2203b2eb0618626210033f2677d1))
* correct error attribution, add retry loop, fix toSSEStream handling ([fab33f2](https://github.com/izzzzzi/opencode-gemini-business/commit/fab33f2f30af74886d3ada37f2b994561f60e23c))
* handle non-array responses in convertToOpenAIFormat, add tests ([1d3e09c](https://github.com/izzzzzi/opencode-gemini-business/commit/1d3e09c6e9e25b501206ea75220fe5d513063dde))
* persist account state when error threshold disables an account ([279ac37](https://github.com/izzzzzi/opencode-gemini-business/commit/279ac375acf071c87164d48102a588a2dc8628f8))
* reduce console noise in plugin loader and fetch handler ([a6b6747](https://github.com/izzzzzi/opencode-gemini-business/commit/a6b6747a890a941edd049fc80c1908ae6e865004))
* replace deprecated substr, use async access instead of existsSync ([6add790](https://github.com/izzzzzi/opencode-gemini-business/commit/6add7906a0e7176a01619c5aa372a36be3bf90e6))
* resolve TS2783 duplicate key error in addAccount spread ([14857b7](https://github.com/izzzzzi/opencode-gemini-business/commit/14857b73117ac1fc3ddd8cba291065309fd99ef0))
* surface write errors to callers while keeping queue resilient ([6d05ce9](https://github.com/izzzzzi/opencode-gemini-business/commit/6d05ce9edc1dba79bfd5561849a4018758281504))


### Features

* add --version flag, warn about credentials in shell history ([0a62ada](https://github.com/izzzzzi/opencode-gemini-business/commit/0a62ada588832a7b6975752ad51e187e43a16b7a))

# [2.2.0](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.1.0...v2.2.0) (2026-03-21)


### Features

* browser-based account login, update model list, swap README lang ([d0eb82f](https://github.com/izzzzzi/opencode-gemini-business/commit/d0eb82fabf337004f330646fb1ec1af38cb87d96))

# [2.1.0](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.0.5...v2.1.0) (2026-02-15)


### Bug Fixes

* update tests for named export and async plugin factory ([582bada](https://github.com/izzzzzi/opencode-gemini-business/commit/582badaa32aefd7cee8c39642224f06972e15b2e))


### Features

* auto-create auth record, update models and streaming ([13c5e8a](https://github.com/izzzzzi/opencode-gemini-business/commit/13c5e8a065051deadc4663757b42cbba189fcaec))

## [2.0.5](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.0.4...v2.0.5) (2026-02-15)


### Bug Fixes

* refactor plugin structure to fix OpenCode compatibility ([c7578ee](https://github.com/izzzzzi/opencode-gemini-business/commit/c7578ee9249cf2a8647470b449275de5684284e7))

## [2.0.4](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.0.3...v2.0.4) (2026-02-15)


### Bug Fixes

* initialize AccountManager outside async loader ([15864ca](https://github.com/izzzzzi/opencode-gemini-business/commit/15864ca500d4751af09db77f0d8030c8cf9ac3b8))

## [2.0.3](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.0.2...v2.0.3) (2026-02-15)


### Bug Fixes

* change plugin export to synchronous function ([f578bf6](https://github.com/izzzzzi/opencode-gemini-business/commit/f578bf68d601f194552a15d690fffd96298e7581))

## [2.0.2](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.0.1...v2.0.2) (2026-02-15)


### Bug Fixes

* add exports field to package.json for proper ES module resolution ([6835f96](https://github.com/izzzzzi/opencode-gemini-business/commit/6835f96252956b76b21a06ea541500c0048d1edf))

## [2.0.1](https://github.com/izzzzzi/opencode-gemini-business/compare/v2.0.0...v2.0.1) (2026-02-15)


### Bug Fixes

* correct widgetStreamAssist request/response format ([4ce720b](https://github.com/izzzzzi/opencode-gemini-business/commit/4ce720b3a51c5812bb611877b763540cadc9c117))

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
