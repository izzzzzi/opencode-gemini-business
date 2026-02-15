# 🔍 Research Report: Gemini Business Integration Analysis

## 📊 Similar Projects Found

| Project | ⭐ Stars | Language | Description |
|---------|---------|----------|-------------|
| [gemini-business2api](https://github.com/Dreamy-rain/gemini-business2api) | 760 | Python | OpenAI-compatible API for Gemini Business with multi-account load balancing |
| [business2api](https://github.com/XxxXTeam/business2api) | 398 | Go | OpenAI/Gemini compatible Gemini Business API proxy |
| [business-gemini-pool](https://github.com/ddcat666/business-gemini-pool) | 267 | Python | Gemini Enterprise Business account rotation pool (OpenAPI interface) |
| [gemini-business](https://github.com/linlee996/gemini-business) | 177 | Python | Integrated bulk registration, token refresh, 2API service |
| [business-gemini-2api](https://github.com/lulistart/business-gemini-2api) | 96 | Python | Auto-registration, cookie keep-alive |

## 🚨 Critical Issues Found

### 1. **Wrong API Endpoints**

**Current Implementation** (`src/gemini-provider.ts:8`):
```typescript
const GEMINI_API_BASE = 'https://aistudio.google.com';
```

**Problem**: This is for Google AI Studio (free/dev), NOT Gemini Business!

**Correct Gemini Business Endpoints** (from business-gemini-pool):
```python
BASE_URL = "https://biz-discoveryengine.googleapis.com/v1alpha/locations/global"
CREATE_SESSION_URL = f"{BASE_URL}/widgetCreateSession"
STREAM_ASSIST_URL = f"{BASE_URL}/widgetStreamAssist"
GETOXSRF_URL = "https://business.gemini.google/auth/getoxsrf"
```

### 2. **Wrong Architecture**

**Current Architecture** (INCORRECT):
```
OpenCode → opencode-gemini-business → Gemini Business API (direct)
                                       ❌ Wrong endpoints
                                       ❌ Wrong auth flow
```

**Correct Architecture**:
```
OpenCode → opencode-gemini-business → business-gemini-pool (proxy) → Gemini Business API
           (OpenCode plugin)          (Flask server)                (Google API)
           localhost:PORT              localhost:8000                biz-discoveryengine.googleapis.com
```

### 3. **Authentication Flow Mismatch**

**Current Implementation**:
- Tries to call `/api/auth/jwt` endpoint
- Expects OpenAI-compatible format directly from Gemini

**Correct Flow** (from business-gemini-pool):
1. Get XSRF token from `https://business.gemini.google/auth/getoxsrf`
2. Create session with `widgetCreateSession`
3. Use session for `widgetStreamAssist` calls
4. Handle rotation and JWT internally in the proxy

### 4. **API Format Mismatch**

**Gemini Business Native API** is NOT OpenAI-compatible:
- Uses `widgetStreamAssist` format (different from OpenAI)
- Different message structure
- Different error codes
- Different authentication

**business-gemini-pool** acts as a **translation layer**:
- Accepts OpenAI format requests (`/v1/chat/completions`)
- Translates to Gemini Business format
- Handles all the complex auth and session management
- Returns OpenAI-compatible responses

## ✅ Recommended Solution

### Option 1: Use business-gemini-pool as Proxy (RECOMMENDED)

**Architecture**:
```
┌─────────────────┐
│   OpenCode      │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│  opencode-gemini-business       │
│  (Simplified client)            │
│  - Account rotation             │
│  - Health monitoring            │
│  - Config management            │
└────────┬────────────────────────┘
         │ OpenAI-compatible API
         v
┌─────────────────────────────────┐
│  business-gemini-pool           │
│  (Translation proxy)            │
│  - OpenAI → Gemini translation  │
│  - JWT/XSRF handling            │
│  - Session management           │
└────────┬────────────────────────┘
         │ Gemini Business API
         v
┌─────────────────────────────────┐
│  Gemini Business API            │
│  biz-discoveryengine.googleapis │
└─────────────────────────────────┘
```

**Changes Needed**:
1. ✅ Remove direct Gemini Business API calls
2. ✅ Point to business-gemini-pool instance (e.g., `http://localhost:8000`)
3. ✅ Keep account rotation logic for multiple pool instances
4. ✅ Simplify to OpenAI client only

### Option 2: Reimplement business-gemini-pool in TypeScript

**Pros**:
- Native TypeScript integration
- No external Python dependency

**Cons**:
- Complex: Need to reimplement all Gemini Business API logic
- Maintenance burden: API changes require updates
- Duplicate effort: business-gemini-pool already works

## 📋 Configuration Comparison

### business-gemini-pool Config Format:
```json
{
  "proxy": "http://127.0.0.1:7890",
  "proxy_enabled": false,
  "image_base_url": "http://127.0.0.1:8000/",
  "image_output_mode": "url",
  "log_level": "INFO",
  "accounts": [
    {
      "name": "Account 1",
      "team_id": "...",
      "cookies": {
        "__Secure-c_ses": "...",
        "__Host-c_oses": "..."
      },
      "csesidx": "...",
      "user_agent": "..."
    }
  ],
  "models": [
    {
      "id": "gemini-3-pro-preview",
      "name": "gemini-3-pro-preview",
      "context_length": 32768,
      "max_tokens": 8192
    }
  ]
}
```

### Current opencode-gemini-business Config:
```json
{
  "accounts": [
    {
      "id": "account-1",
      "name": "Primary",
      "team_id": "team_abc123",
      "cookies": {
        "secure_c_ses": "...",
        "host_c_oses": "..."
      },
      "csesidx": "...",
      "enabled": true
    }
  ],
  "rotation_strategy": "round-robin"
}
```

## 🎯 Action Items

### Immediate Fixes:

1. **Change Base URL**:
   ```typescript
   // From:
   const GEMINI_API_BASE = 'https://aistudio.google.com';

   // To:
   const POOL_BASE_URL = process.env.GEMINI_POOL_URL || 'http://localhost:8000';
   ```

2. **Simplify Provider**:
   - Remove JWT refresh logic (handled by pool)
   - Use standard OpenAI client
   - Point to business-gemini-pool instance

3. **Update Documentation**:
   - Clarify that business-gemini-pool is required
   - Add setup instructions for running the pool
   - Update credential extraction instructions

4. **Add Pool Management**:
   - Support multiple pool instances
   - Rotate between pool servers
   - Monitor pool health

### Testing Checklist:

- [ ] Run business-gemini-pool locally
- [ ] Configure accounts in pool
- [ ] Point plugin to pool URL
- [ ] Test chat completions
- [ ] Test model listing
- [ ] Test account rotation
- [ ] Test failover scenarios
- [ ] Verify streaming works

## 📖 References

- [business-gemini-pool](https://github.com/ddcat666/business-gemini-pool) - Main proxy implementation
- [gemini-business2api](https://github.com/Dreamy-rain/gemini-business2api) - Alternative implementation
- [business2api](https://github.com/XxxXTeam/business2api) - Go implementation

## 🤔 Community Issues Addressed

From business-gemini-pool issues:

| Issue | Status | Solution |
|-------|--------|----------|
| Token expiration (#19) | Known | Handled by pool's JWT refresh |
| Model list needed (#28) | Important | Pool config defines models |
| Session expiration | Frequent | Pool handles session lifecycle |
| Copilot tool support (#33) | Open | Complex OpenAI protocol needs investigation |
| Max tokens config (#26) | Open | Configurable in pool's model settings |
