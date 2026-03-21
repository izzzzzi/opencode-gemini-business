## Context

The model map in `mapModelId()` (`src/gemini-business-api.ts:305-314`) is a hardcoded `Record<string, string>` that translates user-facing model names to Gemini Business API model IDs. It currently contains 4 entries. The Gemini Business UI now shows a different set of models, including `gemini-3.1-pro-preview` and an auto-select option.

The model ID is passed in `assistGenerationConfig.modelId` within the `streamAssistRequest` body (line 262).

## Goals / Non-Goals

**Goals:**
- Support all current Gemini Business models including `gemini-3.1-pro-preview`
- Support auto-select mode (Gemini picks the best model)
- Remove deprecated `gemini-3-pro-preview` alias
- Keep model aliases intuitive (`gemini-3.1-pro` → `gemini-3.1-pro-preview`)

**Non-Goals:**
- Dynamic model discovery from API (no such endpoint exists)
- Changing the model selection architecture beyond updating the map
- Adding model capability metadata (context window, pricing, etc.)

## Decisions

### 1. Auto-select via empty modelId

**Choice**: When user passes `auto` as model name, omit `modelId` from `assistGenerationConfig` (or pass empty string).

**Rationale**: The Gemini Business UI sends an empty model ID for auto-select. Matching this behavior is the safest approach.

**Alternative considered**: A special sentinel value — but the API expects empty, not a keyword.

### 2. Updated model map

**Choice**: New map:

```
'gemini-2.5-flash'  → 'gemini-2.5-flash'
'gemini-2.5-pro'    → 'gemini-2.5-pro'
'gemini-3-flash'    → 'gemini-3-flash-preview'
'gemini-3.1-pro'    → 'gemini-3.1-pro-preview'
'auto'              → '' (empty — auto-select)
```

Removed: `'gemini-3-pro' → 'gemini-3-pro-preview'` (no longer in UI).

**Passthrough**: Unknown model names still pass through as-is (`return model`), so users can try any model ID directly.

### 3. Default model stays `gemini-2.5-flash`

**Choice**: Keep the default. It's the most reliable and fast model.

**Alternative considered**: Switch default to `auto` — but auto-select behavior is opaque and may surprise users.

## Risks / Trade-offs

- **[Risk] `gemini-3-pro-preview` still works on the API even though removed from UI** → Mitigation: Passthrough still allows it. We just remove the convenience alias.
- **[Risk] Auto-select model returns different response formats** → Mitigation: Our response parser handles the generic `streamAssistResponse` format, which is model-agnostic.
- **[Trade-off] Hardcoded map vs dynamic discovery** → Acceptable: No discovery API exists. Map is easy to update.
