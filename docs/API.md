# API Reference

## Plugin Exports

The plugin exports functions that OpenCode calls to interact with the Gemini Business pool.

### initialize()

Initialize the plugin and load accounts.

```typescript
async function initialize(): Promise<OpenCodeGeminiBusinessProvider>
```

**Returns:** Provider instance

**Throws:** Error if no accounts configured

**Example:**
```typescript
const provider = await initialize();
```

### chatCompletion(request)

Execute a chat completion request with automatic retry and failover.

```typescript
async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionResponse>>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `request` | `ChatCompletionRequest` | Chat completion request |

**ChatCompletionRequest:**
```typescript
{
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}
```

**ChatMessage:**
```typescript
{
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}
```

**Returns:**
- Non-streaming: `ChatCompletionResponse`
- Streaming: `AsyncIterable<ChatCompletionResponse>`

**ChatCompletionResponse:**
```typescript
{
  id: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**Example:**
```typescript
const response = await chatCompletion({
  model: 'gemini-2.5-pro',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

console.log(response.choices[0].message.content);
```

**Streaming Example:**
```typescript
const stream = await chatCompletion({
  model: 'gemini-2.5-pro',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

### listModels()

List available models from an active account.

```typescript
async function listModels(): Promise<ModelInfo[]>
```

**Returns:** Array of model information

**ModelInfo:**
```typescript
{
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}
```

**Example:**
```typescript
const models = await listModels();
models.forEach(model => {
  console.log(`${model.id} (${model.owned_by})`);
});
```

## CLI Commands

### add-account

Add a new Gemini Business account.

```bash
opencode-gemini-business add-account <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx> [user_agent]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Friendly account name |
| `team_id` | Yes | Google Team ID |
| `secure_c_ses` | Yes | Secure session cookie |
| `host_c_oses` | Yes | Host session cookie |
| `csesidx` | Yes | Session index |
| `user_agent` | No | Custom user agent |

**Environment Variables:**
- `GEMINI_ACCOUNT_NAME`
- `GEMINI_TEAM_ID`
- `GEMINI_SECURE_C_SES`
- `GEMINI_HOST_C_OSES`
- `GEMINI_CSESIDX`
- `GEMINI_USER_AGENT`

**Example:**
```bash
opencode-gemini-business add-account \
  "Production" \
  "team_abc123" \
  "ses_cookie_value" \
  "oses_cookie_value" \
  "idx_value"
```

**Output:**
```
✅ Account added successfully! ID: account-1708012345678-abc123
   Name: Production
   Team ID: team_abc123
```

### list-accounts

List all configured accounts with status.

```bash
opencode-gemini-business list-accounts
```

**Example Output:**
```
Found 3 account(s):

[1] Production (account-1708012345678-abc123)
    Team ID: team_abc123
    Status: ✅ Enabled
    Errors: 0
    Last Used: 2026-02-15T10:30:00.000Z

[2] Development (account-1708012345679-def456)
    Team ID: team_def456
    Status: ✅ Enabled
    Errors: 0
    Last Used: 2026-02-15T09:15:00.000Z

[3] Testing (account-1708012345680-ghi789)
    Team ID: team_ghi789
    Status: ❌ Disabled
    Errors: 3
    Last Error: JWT refresh failed: 401 Unauthorized
    Last Used: 2026-02-15T08:00:00.000Z
```

### remove-account

Remove an account from the pool.

```bash
opencode-gemini-business remove-account <account_id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `account_id` | Yes | Account ID to remove |

**Example:**
```bash
opencode-gemini-business remove-account account-1708012345678-abc123
```

**Output:**
```
✅ Account account-1708012345678-abc123 removed successfully
```

### test-account

Test account credentials and connectivity.

```bash
opencode-gemini-business test-account <account_id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `account_id` | Yes | Account ID to test |

**Example:**
```bash
opencode-gemini-business test-account account-1708012345678-abc123
```

**Successful Output:**
```
Testing account: Production (account-1708012345678-abc123)
Please wait...

✅ Account test successful!
   Connection: OK
   Authentication: OK
```

**Failed Output:**
```
Testing account: Production (account-1708012345678-abc123)
Please wait...

❌ Account test failed!
   Error: JWT refresh failed: 401 Unauthorized
```

### help

Display help information.

```bash
opencode-gemini-business help
```

## AccountManager API

For programmatic usage:

### constructor(config?)

Create a new AccountManager instance.

```typescript
constructor(config?: Partial<PoolConfig>)
```

**Example:**
```typescript
const manager = new AccountManager({
  rotation_strategy: 'least-used',
  max_retries: 5,
  error_threshold: 5
});
```

### loadAccounts()

Load accounts from config file.

```typescript
async loadAccounts(): Promise<void>
```

### saveAccounts()

Save accounts to config file.

```typescript
async saveAccounts(): Promise<void>
```

### addAccount(account)

Add a new account.

```typescript
async addAccount(account: Omit<GeminiBusinessAccount, 'id'>): Promise<string>
```

**Returns:** New account ID

### removeAccount(id)

Remove an account.

```typescript
async removeAccount(id: string): Promise<boolean>
```

**Returns:** `true` if removed, `false` if not found

### getNextAccount()

Get next available account based on rotation strategy.

```typescript
getNextAccount(): GeminiBusinessAccount | null
```

**Returns:** Account or `null` if none available

### markAccountError(accountId, error)

Mark an account as failed.

```typescript
markAccountError(accountId: string, error: string): void
```

### resetAccountErrors(accountId)

Reset account error count.

```typescript
resetAccountErrors(accountId: string): void
```

### needsJWTRefresh(account)

Check if JWT needs refresh.

```typescript
needsJWTRefresh(account: GeminiBusinessAccount): boolean
```

**Returns:** `true` if refresh needed

### updateJWT(accountId, jwt, expiresIn)

Update account JWT.

```typescript
async updateJWT(accountId: string, jwt: string, expiresIn: number): Promise<void>
```

### getAccounts()

Get all accounts.

```typescript
getAccounts(): GeminiBusinessAccount[]
```

### getConfig()

Get current configuration.

```typescript
getConfig(): PoolConfig
```

## GeminiBusinessProvider API

### constructor(account, baseUrl?)

Create a provider instance for an account.

```typescript
constructor(account: GeminiBusinessAccount, baseUrl?: string)
```

### getJWT()

Get or refresh JWT token.

```typescript
async getJWT(): Promise<string>
```

### chatCompletion(request)

Send chat completion request.

```typescript
async chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionResponse>>
```

### listModels()

List available models.

```typescript
async listModels(): Promise<ModelInfo[]>
```

### testAccount()

Test account credentials.

```typescript
async testAccount(): Promise<{ success: boolean; error?: string }>
```

## Error Handling

All async functions may throw errors. Common error types:

### Configuration Errors

```typescript
throw new Error('No Gemini Business accounts configured. Please add accounts...');
throw new Error('No available accounts. All accounts may be disabled...');
```

### Authentication Errors

```typescript
throw new Error('JWT refresh failed: 401 Unauthorized');
throw new Error('Failed to refresh JWT: ...');
```

### API Errors

```typescript
throw new Error('Chat completion failed: 429 Too Many Requests');
throw new Error('Failed to list models: 500 Internal Server Error');
```

### Retry Errors

```typescript
throw new Error('All retry attempts failed. Last error: ...');
```

## Events

The plugin does not emit events, but you can monitor:

- Account status via `list-accounts` command
- Error logs via stderr
- Config file changes at `~/.config/opencode/gemini-business-accounts.json`

## Rate Limits

Rate limits depend on your Gemini Business account quotas:
- Requests per minute (RPM)
- Tokens per minute (TPM)
- Requests per day (RPD)

The plugin automatically rotates to the next account when hitting limits.
