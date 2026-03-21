## 1. Model Map Update

- [x] 1.1 Update `mapModelId()` in `src/gemini-business-api.ts`: add `gemini-3.1-pro` → `gemini-3.1-pro-preview`, add `auto` → `''`, remove `gemini-3-pro` → `gemini-3-pro-preview`. [API]
- [x] 1.2 Update `convertToGeminiFormat()` to handle empty `modelId` for auto-select: omit `modelId` from `assistGenerationConfig` or pass empty string. [API]

## 2. Testing

- [x] 2.1 Add unit tests for new model mappings: `gemini-3.1-pro`, `gemini-3.1-pro-preview` passthrough, `auto` → empty string. [API]
- [x] 2.2 Add unit test for removed alias: `gemini-3-pro` passes through unmapped. [API]
- [x] 2.3 Verify existing tests pass (`npm test`). [API]

## 3. Documentation

- [x] 3.1 Update supported models list in README.md and README.ru.md: add `gemini-3.1-pro`, `auto`; remove `gemini-3-pro-preview`. [CLI]
- [x] 3.2 Update `examples/opencode-config-example.json` with new model entries. [CLI]
- [x] 3.3 Update `openspec/config.yaml` supported models list. [CLI]
