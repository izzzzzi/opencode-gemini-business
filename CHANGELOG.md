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
