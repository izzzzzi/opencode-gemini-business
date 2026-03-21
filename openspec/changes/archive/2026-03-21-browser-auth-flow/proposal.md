## Why

Adding a Gemini Business account currently requires 6 manual steps: opening DevTools, extracting cookies (`__Secure-C_SES`, `__Host-C_OSES`), finding `team_id` and `csesidx` values, and passing them all as CLI arguments. This process is error-prone and intimidating for non-technical users. Automating credential capture via a browser-based login flow reduces it to a single command.

## What Changes

- Add a new browser-based login flow to `add-account` command (becomes the default)
- Launch the user's system Chrome via `puppeteer-core` + `chrome-launcher` with a clean profile
- Navigate to `business.gemini.google` and let the user authenticate normally
- Automatically extract cookies from the browser context after login
- Intercept network requests to capture `csesidx` (from `getoxsrf` query params) and `team_id` (from `widgetCreateSession` request body as `configId`)
- Preserve the old manual flow as `add-account --manual` for advanced users and environments without Chrome

## Capabilities

### New Capabilities
- `browser-credential-capture`: Automated credential extraction via headful Chrome browser — launching system Chrome, monitoring cookies, intercepting network requests for `csesidx` and `team_id`, and assembling a complete account record

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Dependencies**: New dependencies — `puppeteer-core` (~2 MB), `chrome-launcher` (~50 KB). No impact on existing runtime dependencies.
- **CLI**: `add-account` command changes default behavior from manual args to browser flow. Old behavior preserved via `--manual` flag. Fully backward compatible.
- **Security**: Clean browser profile per session — no access to user's existing browser data. Credentials still stored locally in `~/.config/opencode/`. No new external data transmission.
- **Platform**: Requires Google Chrome or Chromium installed on the system. Graceful error with install instructions if not found.
- **Existing accounts**: No impact. Existing account configs remain unchanged.
