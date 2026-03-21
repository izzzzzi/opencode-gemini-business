## Why

Gemini Business UI now offers `gemini-3.1-pro-preview` and an "auto-select" mode (empty model ID), but our plugin doesn't support them. Additionally, `gemini-3-pro-preview` has been removed from the UI, suggesting it's deprecated. Users requesting these new models get a fallback to `gemini-2.5-flash` instead.

## What Changes

- Add `gemini-3.1-pro-preview` to the model map (aliased as `gemini-3.1-pro`)
- Add auto-select model support (empty `modelId` in `assistGenerationConfig`)
- Remove deprecated `gemini-3-pro-preview` mapping
- Update README model lists and OpenCode config examples

## Capabilities

### New Capabilities
- `model-registry`: Centralized model list with ID mapping, auto-select support, and model metadata (name, description, preview status)

### Modified Capabilities

## Impact

- **Code**: `mapModelId()` in `src/gemini-business-api.ts` — update model map. `index.ts` — update model list if referenced. Config examples in `examples/`.
- **Backward compatibility**: Users with `gemini-3-pro` in their config will get a fallback (passthrough to API, which may reject it). No **BREAKING** change — the alias just stops mapping to a known value.
- **Dependencies**: None.
- **Accounts**: No impact on existing accounts or credentials.
