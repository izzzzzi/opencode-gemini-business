## 1. Dependencies & Setup

- [x] 1.1 Add `puppeteer-core` and `chrome-launcher` to package.json dependencies. Verify `npm install` succeeds and no Chromium binary is downloaded. [CLI]
- [x] 1.2 Add `BrowserAuthOptions` and `CapturedCredentials` interfaces to `src/types.ts` [API]

## 2. Browser Auth Module

- [x] 2.1 Create `src/browser-auth.ts` with `BrowserAuth` class: constructor accepts optional timeout config. [API]
- [x] 2.2 Implement `findChrome()` method using `chrome-launcher` to detect system Chrome/Chromium. Return path or throw with descriptive error and install link. [API]
- [x] 2.3 Implement `launchBrowser()` method: launch headful Chrome with temporary profile via `puppeteer-core`, navigate to `https://business.gemini.google`. [API]
- [x] 2.4 Implement cookie monitoring: poll `page.cookies()` every 2 seconds for `__Secure-C_SES` and `__Host-C_OSES`. Capture User-Agent from browser. [API]
- [x] 2.5 Implement request interception: `page.on('request')` to capture `csesidx` from `getoxsrf` URL params and `team_id` (`configId`) from `widgetCreateSession` POST body. [API]
- [x] 2.6 Implement `captureCredentials()` orchestrator: runs cookie monitoring + request interception, handles overall 10-min timeout, 5-min inactivity reminder, browser-closed-early error. Returns `CapturedCredentials`. [API]

## 3. CLI Integration

- [x] 3.1 Update `addAccountCommand()` in `cli.ts`: detect `--manual` flag. Without it, use `BrowserAuth.captureCredentials()`. With it, use existing positional args flow. [CLI]
- [x] 3.2 Update CLI console output: progress messages ("Launching Chrome...", "Waiting for login...", "Logged in! Send a message in chat...", "Account added!"). [CLI]
- [x] 3.3 Update `printHelp()` to document new default browser flow and `--manual` flag. [CLI]

## 4. Testing

- [x] 4.1 Write unit tests for `BrowserAuth.findChrome()`: mock `chrome-launcher` to test found/not-found scenarios. [API]
- [x] 4.2 Write unit tests for credential extraction logic: mock puppeteer page object to test cookie parsing and request interception handlers. [API]
- [x] 4.3 Write unit tests for `addAccountCommand()` with `--manual` flag to verify backward compatibility. [CLI]
- [x] 4.4 Verify existing tests pass (`npm test`). [Account Management]

## 5. Documentation & Finalization

- [x] 5.1 Update README.md and README.ru.md with new browser-based add-account flow, `--manual` flag, and Chrome requirement. [CLI]
- [x] 5.2 Run full build (`npm run build`) and verify dist output includes new module. [API]
