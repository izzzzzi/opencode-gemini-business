# Architecture

## Overview

OpenCode Gemini Business is a plugin that enables multi-account management for Google Gemini Business API with automatic rotation and failover. It follows the architecture patterns of successful OpenCode auth plugins while integrating the pool management concepts from business-gemini-pool.

## Core Components

```
┌─────────────────────────────────────────────────────────┐
│                      OpenCode CLI                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Uses Plugin API
                         ▼
┌─────────────────────────────────────────────────────────┐
│           OpenCodeGeminiBusinessProvider                 │
│  ┌────────────────────────────────────────────────┐    │
│  │  • Initialize accounts                          │    │
│  │  • Handle chat completions                      │    │
│  │  • Coordinate retries                           │    │
│  │  • Manage failover                              │    │
│  └────────────────────────────────────────────────┘    │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
             │                        │
             ▼                        ▼
┌──────────────────────┐   ┌───────────────────────┐
│  AccountManager      │   │  GeminiProvider       │
│  ┌────────────────┐  │   │  ┌─────────────────┐ │
│  │ Load/Save      │  │   │  │ JWT Management  │ │
│  │ Add/Remove     │  │   │  │ API Calls       │ │
│  │ Rotation Logic │  │   │  │ Streaming       │ │
│  │ Error Tracking │  │   │  │ Model List      │ │
│  └────────────────┘  │   │  └─────────────────┘ │
└──────────────────────┘   └───────────────────────┘
             │                        │
             │                        │
             ▼                        ▼
┌──────────────────────┐   ┌───────────────────────┐
│  Config File         │   │  Google AI Studio API │
│  ~/.config/opencode/ │   │  aistudio.google.com  │
│  gemini-business-    │   │                       │
│  accounts.json       │   │                       │
└──────────────────────┘   └───────────────────────┘
```

## Component Details

### 1. OpenCodeGeminiBusinessProvider

**Responsibilities:**
- Entry point for OpenCode integration
- Orchestrates the request flow
- Implements retry logic with exponential backoff
- Manages account failover on errors

**Key Methods:**
- `initialize()`: Load accounts and validate configuration
- `chatCompletion(request)`: Handle chat requests with automatic retry
- `listModels()`: Fetch available models
- `getAccountManager()`: Access to account management

### 2. AccountManager

**Responsibilities:**
- Persist and load account configurations
- Implement rotation strategies
- Track account health and errors
- Enable/disable accounts based on error threshold

**Key Methods:**
- `loadAccounts()`: Load from config file
- `saveAccounts()`: Persist to config file
- `addAccount(account)`: Add new account
- `removeAccount(id)`: Remove account
- `getNextAccount()`: Get next account per rotation strategy
- `markAccountError(id, error)`: Track failures
- `resetAccountErrors(id)`: Clear error count on success
- `needsJWTRefresh(account)`: Check if JWT needs renewal

**Rotation Strategies:**
- **Round-robin**: Cycle through accounts sequentially
- **Least-used**: Select account with oldest last_used timestamp
- **Random**: Randomly select from available accounts

### 3. GeminiBusinessProvider

**Responsibilities:**
- Handle communication with Google AI Studio API
- Manage JWT token lifecycle
- Support streaming and non-streaming responses
- Parse and format API requests/responses

**Key Methods:**
- `getJWT()`: Get or refresh JWT token
- `chatCompletion(request)`: Send chat completion request
- `listModels()`: List available models
- `testAccount()`: Verify account credentials

**Authentication Flow:**
```
1. Check if JWT exists and is valid (> 5 min until expiry)
2. If not, call refreshJWT()
3. refreshJWT() uses cookies to get new JWT:
   - POST to /api/auth/jwt
   - Headers: Cookie with secure_c_ses and host_c_oses
   - Body: team_id, csesidx
   - Response: { jwt, expires_in }
4. Store JWT and expiration time
5. Use JWT for API requests
```

## Data Models

### GeminiBusinessAccount

```typescript
{
  id: string;              // Unique identifier
  name: string;            // Friendly name
  team_id: string;         // Google Team ID
  cookies: {
    secure_c_ses: string;  // Session cookie
    host_c_oses: string;   // Host session cookie
  };
  csesidx: string;         // Session index
  user_agent?: string;     // Optional custom UA
  jwt?: string;            // Cached JWT token
  jwt_expires?: number;    // JWT expiration timestamp
  enabled: boolean;        // Account enabled/disabled
  last_used?: number;      // Last used timestamp
  error_count?: number;    // Consecutive error count
  last_error?: string;     // Last error message
}
```

### PoolConfig

```typescript
{
  accounts: GeminiBusinessAccount[];
  rotation_strategy: 'round-robin' | 'least-used' | 'random';
  max_retries: number;           // Retry attempts per request
  retry_delay: number;           // Base delay between retries (ms)
  jwt_refresh_threshold: number; // Seconds before expiry to refresh
  error_threshold: number;       // Errors before account disable
}
```

## Request Flow

### Successful Request

```
1. User calls OpenCode with gemini-business model
2. OpenCodeGeminiBusinessProvider.chatCompletion() called
3. AccountManager.getNextAccount() selects account
4. Check if JWT needs refresh
5. GeminiBusinessProvider.chatCompletion() sends request
6. Response received successfully
7. AccountManager.resetAccountErrors() clears error count
8. Return response to user
```

### Failed Request with Retry

```
1. User calls OpenCode with gemini-business model
2. OpenCodeGeminiBusinessProvider.chatCompletion() called
3. AccountManager.getNextAccount() → Account A
4. GeminiBusinessProvider.chatCompletion() → Error
5. AccountManager.markAccountError(A, error)
6. Retry attempt 2: AccountManager.getNextAccount() → Account B
7. GeminiBusinessProvider.chatCompletion() → Success
8. AccountManager.resetAccountErrors(B)
9. Return response to user
```

### Account Disabling

```
When account has 3 consecutive errors:
1. AccountManager.markAccountError() increments error_count
2. If error_count >= error_threshold (3):
   - Set account.enabled = false
   - Log warning
   - Account excluded from getNextAccount()
3. Account remains disabled until:
   - Manual re-enable in config
   - Or successful request resets error_count
```

## File Structure

```
opencode-gemini-business/
├── index.ts                    # Main entry point + CLI
├── package.json                # NPM package config
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Test config
├── LICENSE                     # MIT License
├── README.md                   # User documentation
├── CHANGELOG.md                # Version history
├── .gitignore                  # Git ignore rules
│
├── src/
│   ├── types.ts                # TypeScript type definitions
│   ├── account-manager.ts      # Account management logic
│   ├── gemini-provider.ts      # Google API integration
│   └── opencode-provider.ts    # OpenCode plugin interface
│
├── docs/
│   ├── CONFIGURATION.md        # Configuration guide
│   ├── TROUBLESHOOTING.md      # Troubleshooting guide
│   └── ARCHITECTURE.md         # This file
│
└── .github/
    └── workflows/
        └── ci.yml              # CI/CD pipeline
```

## Configuration Storage

```
~/.config/opencode/
├── opencode.json                    # OpenCode main config
└── gemini-business-accounts.json    # Plugin account config
```

## Security Considerations

1. **Credential Storage**
   - Accounts stored in `~/.config/opencode/` (user home directory)
   - File permissions should be 600 (user read/write only)
   - Never commit config files to version control

2. **JWT Tokens**
   - Cached in memory and config file
   - Auto-refresh before expiration
   - Short-lived (typically 1 hour)

3. **API Communication**
   - HTTPS only
   - JWT Bearer token authentication
   - Team ID validation

## Extension Points

### Adding New Rotation Strategies

1. Add strategy to `rotation_strategy` type in `types.ts`
2. Implement logic in `AccountManager.getNextAccount()`
3. Update documentation

### Custom Error Handling

1. Extend `markAccountError()` in AccountManager
2. Add custom error classification
3. Implement recovery strategies

### New API Endpoints

1. Add methods to `GeminiBusinessProvider`
2. Update type definitions in `types.ts`
3. Expose through `OpenCodeGeminiBusinessProvider`

## Performance Considerations

1. **JWT Caching**
   - Tokens cached to avoid unnecessary refreshes
   - Refresh threshold: 5 minutes before expiry

2. **Account Selection**
   - O(n) for round-robin and random
   - O(n) for least-used (single pass)
   - Constant time for subsequent round-robin selections

3. **Retry Logic**
   - Exponential backoff: 1s, 2s, 3s
   - Maximum 3 retries per request
   - Different account per retry

4. **Config Persistence**
   - Saved only when accounts change
   - Loaded once on initialization
   - Minimal disk I/O

## Testing Strategy

1. **Unit Tests**
   - AccountManager rotation logic
   - JWT expiration checks
   - Error handling

2. **Integration Tests**
   - API communication (mocked)
   - Retry with failover
   - Config persistence

3. **Manual Testing**
   - CLI commands
   - OpenCode integration
   - Multi-account scenarios

## Dependencies

### Production
- `@ai-sdk/google`: Google AI SDK
- `node-fetch`: HTTP requests

### Development
- `typescript`: Language
- `vitest`: Testing framework
- `@types/node`: Node.js type definitions

## Comparison with Similar Projects

### vs opencode-gemini-auth
- **Similarity**: OAuth-based authentication, TypeScript
- **Difference**: Single account vs multi-account pool

### vs opencode-antigravity-auth
- **Similarity**: Multi-account support, rotation
- **Difference**: Different API backend (Antigravity vs Gemini Business)

### vs business-gemini-pool
- **Similarity**: Multi-account Gemini pool concept
- **Difference**: Flask backend vs TypeScript, standalone server vs OpenCode plugin

## Future Enhancements

1. **Advanced Monitoring**
   - Usage statistics per account
   - Cost tracking
   - Performance metrics

2. **Intelligent Routing**
   - Route by model capabilities
   - Load balancing based on quota
   - Predictive account selection

3. **Web Dashboard**
   - Real-time account status
   - Usage visualization
   - Configuration UI

4. **Enhanced Security**
   - Encrypted credential storage
   - OAuth2 flow integration
   - Audit logging
