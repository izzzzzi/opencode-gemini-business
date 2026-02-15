# Project Structure

Complete overview of the opencode-gemini-business plugin.

## Directory Tree

```
opencode-gemini-business/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline with tests & publish
├── .gitignore                        # Git ignore rules
├── .npmignore                        # NPM publish ignore rules
├── bin/
│   └── cli.js                        # CLI entry point
├── CHANGELOG.md                      # Version history
├── LICENSE                           # MIT License
├── package.json                      # NPM package configuration
├── PROJECT_STRUCTURE.md              # This file
├── README.md                         # Main documentation
├── tsconfig.json                     # TypeScript configuration
├── vitest.config.ts                  # Test configuration
│
├── docs/                             # Documentation
│   ├── API.md                        # API reference
│   ├── ARCHITECTURE.md               # Architecture overview
│   ├── CONFIGURATION.md              # Configuration guide
│   ├── GETTING_STARTED.md            # Quick start guide
│   └── TROUBLESHOOTING.md            # Troubleshooting guide
│
├── examples/                         # Usage examples
│   ├── config-example.json           # Example account config
│   ├── opencode-config-example.json  # Example OpenCode config
│   └── usage-example.ts              # Code examples
│
├── index.ts                          # Main plugin entry point
│
└── src/                              # Source code
    ├── account-manager.ts            # Multi-account management
    ├── gemini-provider.ts            # Gemini API integration
    ├── opencode-provider.ts          # OpenCode plugin interface
    └── types.ts                      # TypeScript type definitions
```

## Key Files Description

### Root Files

| File | Purpose |
|------|---------|
| `index.ts` | Main entry point, exports plugin API and CLI commands |
| `package.json` | NPM configuration, dependencies, scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `vitest.config.ts` | Vitest testing framework configuration |
| `README.md` | Main user-facing documentation |
| `CHANGELOG.md` | Version history and release notes |
| `LICENSE` | MIT License |

### Source Code (`src/`)

| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | ~100 | Type definitions for accounts, requests, responses |
| `account-manager.ts` | ~200 | Account pool management, rotation, error tracking |
| `gemini-provider.ts` | ~200 | Gemini Business API communication, JWT handling |
| `opencode-provider.ts` | ~100 | OpenCode integration layer, retry logic |

**Total source code: ~600 lines**

### Documentation (`docs/`)

| File | Pages | Purpose |
|------|-------|---------|
| `GETTING_STARTED.md` | 5 | Step-by-step setup guide |
| `CONFIGURATION.md` | 8 | Detailed configuration options |
| `API.md` | 12 | Complete API reference |
| `ARCHITECTURE.md` | 10 | System architecture and design |
| `TROUBLESHOOTING.md` | 6 | Common issues and solutions |

**Total documentation: ~41 pages**

### Examples (`examples/`)

| File | Purpose |
|------|---------|
| `config-example.json` | Sample account configuration |
| `opencode-config-example.json` | Sample OpenCode integration config |
| `usage-example.ts` | 10 code examples demonstrating features |

### CI/CD (`.github/workflows/`)

| File | Purpose |
|------|---------|
| `ci.yml` | Automated testing, building, and NPM publishing |

## Component Interaction

```
┌─────────────┐
│  OpenCode   │
│     CLI     │
└──────┬──────┘
       │
       │ plugin API
       ▼
┌──────────────────────────┐
│ OpenCodeGeminiProvider   │
│ - initialize()           │
│ - chatCompletion()       │
│ - listModels()           │
└──────────┬───────────────┘
           │
           ├─────────────────┬─────────────────┐
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Account     │  │   Gemini    │  │   Config    │
    │  Manager     │  │  Provider   │  │    File     │
    └──────────────┘  └─────────────┘  └─────────────┘
           │                 │                 │
           │                 ▼                 ▼
           │          ┌─────────────┐  ┌─────────────┐
           │          │   Gemini    │  │   ~/.config │
           │          │Business API │  │  /opencode/ │
           │          └─────────────┘  └─────────────┘
           │
           ▼
    ┌──────────────┐
    │   Rotation   │
    │   Strategy   │
    └──────────────┘
```

## Code Statistics

### By Language

| Language | Files | Lines | Percentage |
|----------|-------|-------|------------|
| TypeScript | 8 | ~1200 | 85% |
| JSON | 4 | ~150 | 10% |
| Markdown | 6 | ~2000 | 5% |

### By Category

| Category | Lines | Percentage |
|----------|-------|------------|
| Source Code | 600 | 18% |
| Documentation | 2000 | 59% |
| Configuration | 150 | 4% |
| Tests | 0 | 0% (planned) |
| Examples | 650 | 19% |

**Total: ~3400 lines**

## Build Artifacts

After building (`npm run build`), the `dist/` directory contains:

```
dist/
├── index.js                 # Compiled main entry
├── index.d.ts              # Type definitions
├── src/
│   ├── account-manager.js
│   ├── account-manager.d.ts
│   ├── gemini-provider.js
│   ├── gemini-provider.d.ts
│   ├── opencode-provider.js
│   ├── opencode-provider.d.ts
│   ├── types.js
│   └── types.d.ts
└── *.map                   # Source maps
```

## Configuration Files

### Runtime Configuration

Located in user's home directory:

```
~/.config/opencode/
├── opencode.json                    # OpenCode configuration
└── gemini-business-accounts.json    # Plugin accounts config
```

### Development Configuration

In project root:

```
├── tsconfig.json        # TypeScript compiler options
├── vitest.config.ts     # Test runner configuration
├── package.json         # NPM package & scripts
└── .gitignore          # Version control ignores
```

## NPM Package Contents

When published to NPM, the package includes:

```
opencode-gemini-business@1.0.0
├── dist/               # Compiled JavaScript + types
├── bin/                # CLI entry point
├── README.md           # Documentation
├── LICENSE             # MIT License
├── CHANGELOG.md        # Version history
└── package.json        # Package metadata
```

**Total package size: ~200KB** (estimated)

## Architecture Layers

### Layer 1: User Interface
- **CLI Commands**: `add-account`, `list-accounts`, `test-account`, etc.
- **OpenCode Integration**: Seamless model usage

### Layer 2: Business Logic
- **OpenCodeGeminiProvider**: Request orchestration, retry logic
- **AccountManager**: Account pool management, rotation strategies

### Layer 3: External Communication
- **GeminiBusinessProvider**: API communication, JWT management
- **Config Persistence**: File system operations

### Layer 4: External Services
- **Gemini Business API**: Google AI Studio backend
- **File System**: Configuration storage

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@ai-sdk/google` | ^1.0.0 | Google AI SDK |
| `node-fetch` | ^3.3.2 | HTTP client |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.0 | TypeScript compiler |
| `vitest` | ^1.0.0 | Testing framework |
| `@types/node` | ^20.0.0 | Node.js type definitions |

**Total dependencies: 5**

## Feature Checklist

- [x] Multi-account management
- [x] Automatic account rotation (3 strategies)
- [x] JWT token auto-refresh
- [x] Error tracking and auto-disable
- [x] Retry with failover
- [x] OpenCode integration
- [x] CLI interface
- [x] Streaming support
- [x] Multimodal support (text + images)
- [x] Comprehensive documentation
- [x] TypeScript with full types
- [x] CI/CD pipeline
- [ ] Unit tests (planned)
- [ ] Integration tests (planned)
- [ ] Web dashboard (future)

## Development Workflow

### Initial Setup
```bash
npm install
npm run build
```

### Development
```bash
npm run build:watch    # Watch mode
npm run lint          # Type checking
```

### Testing
```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Publishing
```bash
npm run build
npm publish
```

## Contributing Areas

### Code
- Add unit tests for AccountManager
- Add integration tests for GeminiProvider
- Implement more rotation strategies
- Add usage analytics

### Documentation
- Add video tutorials
- Create interactive examples
- Translate to other languages

### Features
- Web dashboard for monitoring
- Usage statistics and reporting
- Advanced quota management
- OAuth2 flow integration

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Refresh documentation
- Review and close issues
- Monitor for breaking changes in Gemini API

### Security
- Audit dependencies for vulnerabilities
- Review credential storage security
- Update security best practices

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-15 | Initial release |

## License

MIT License - See [LICENSE](../LICENSE) file

## Related Projects

- [opencode-openai-codex-auth](https://github.com/numman-ali/opencode-openai-codex-auth) - OpenAI Codex auth plugin
- [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth) - Single-account Gemini auth
- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Antigravity auth plugin
- [business-gemini-pool](https://github.com/ddcat666/business-gemini-pool) - Original pool concept

## Support

- **Issues**: https://github.com/izzzzzi/opencode-gemini-business/issues
- **Discussions**: https://github.com/izzzzzi/opencode-gemini-business/discussions
- **Email**: (add your email)
