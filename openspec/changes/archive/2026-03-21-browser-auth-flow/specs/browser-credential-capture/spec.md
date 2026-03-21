## ADDED Requirements

### Requirement: Browser launch with system Chrome
The CLI SHALL launch the user's system-installed Google Chrome or Chromium in headful mode with a clean (temporary) profile when `add-account` is invoked without the `--manual` flag.

#### Scenario: Chrome is installed
- **WHEN** user runs `opencode-gemini-business add-account`
- **THEN** the system launches Chrome in headful mode with a temporary profile and navigates to `https://business.gemini.google`

#### Scenario: Chrome is not installed
- **WHEN** user runs `opencode-gemini-business add-account` and no Chrome/Chromium is found
- **THEN** the system displays an error with a Chrome install link and instructions to use `--manual` flag

#### Scenario: Clean profile isolation
- **WHEN** the browser is launched for account capture
- **THEN** a fresh temporary profile MUST be used (no access to existing browser sessions, cookies, or extensions)

### Requirement: Cookie extraction after login
The system SHALL monitor the browser cookies and automatically extract `__Secure-C_SES` and `__Host-C_OSES` from the `business.gemini.google` domain after the user completes authentication.

#### Scenario: Successful login detection
- **WHEN** the user completes Google authentication in the browser
- **THEN** the system detects the presence of `__Secure-C_SES` cookie and extracts both `__Secure-C_SES` and `__Host-C_OSES` values

#### Scenario: User closes browser before login
- **WHEN** the user closes the browser window before completing authentication
- **THEN** the system displays an error: "Browser closed before login completed"

### Requirement: Network request interception for csesidx
The system SHALL intercept outgoing requests to the `getoxsrf` endpoint and extract the `csesidx` value from the URL query parameters.

#### Scenario: csesidx captured from getoxsrf request
- **WHEN** the browser sends a GET request to `/auth/getoxsrf?csesidx=<value>`
- **THEN** the system extracts the `csesidx` value from the query string

### Requirement: Network request interception for team_id
The system SHALL intercept outgoing requests to the `widgetCreateSession` endpoint and extract the `team_id` value from the `configId` field in the JSON request body.

#### Scenario: team_id captured from widgetCreateSession request
- **WHEN** the browser sends a POST request to `widgetCreateSession` with body containing `configId`
- **THEN** the system extracts the `configId` value as `team_id`

### Requirement: Complete credential assembly and account creation
The system SHALL assemble all captured values into a complete account record and save it via the existing AccountManager after all 4 credentials are captured.

#### Scenario: All credentials captured successfully
- **WHEN** cookies (`__Secure-C_SES`, `__Host-C_OSES`), `csesidx`, and `team_id` are all captured
- **THEN** the system closes the browser, creates the account via AccountManager, runs `ensureAuthRecord()`, and displays a success message with the account ID

#### Scenario: User agent capture
- **WHEN** the browser is active during credential capture
- **THEN** the system captures the browser's User-Agent string and stores it with the account

### Requirement: Timeout handling
The system SHALL enforce a maximum timeout for the entire browser-based capture flow.

#### Scenario: Overall timeout exceeded
- **WHEN** 10 minutes elapse without all credentials being captured
- **THEN** the system closes the browser and displays a timeout error with instructions to retry or use `--manual`

#### Scenario: Inactivity reminder
- **WHEN** cookies are captured (login complete) but network credentials are not captured within 5 minutes
- **THEN** the system displays a reminder in the CLI prompting the user to send a message in the Gemini Business chat

### Requirement: Manual mode fallback
The existing manual `add-account` flow (positional args / env vars) SHALL remain available via the `--manual` flag.

#### Scenario: Manual mode invocation
- **WHEN** user runs `opencode-gemini-business add-account --manual <name> <team_id> <cookies...>`
- **THEN** the system uses the existing manual flow without launching a browser

#### Scenario: Default behavior without flag
- **WHEN** user runs `opencode-gemini-business add-account` without `--manual`
- **THEN** the system uses the browser-based flow
