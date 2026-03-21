## ADDED Requirements

### Requirement: Gemini 3.1 Pro model support
The system SHALL accept `gemini-3.1-pro` as a model name and map it to `gemini-3.1-pro-preview` when sending requests to the Gemini Business API.

#### Scenario: User requests gemini-3.1-pro
- **WHEN** a chat completion request is made with model `gemini-3.1-pro`
- **THEN** the system sends `modelId: "gemini-3.1-pro-preview"` in `assistGenerationConfig`

#### Scenario: User requests gemini-3.1-pro-preview directly
- **WHEN** a chat completion request is made with model `gemini-3.1-pro-preview`
- **THEN** the system passes the model ID through as-is

### Requirement: Auto-select model support
The system SHALL accept `auto` as a model name and omit or send an empty `modelId` in `assistGenerationConfig`, allowing Gemini to choose the most appropriate model.

#### Scenario: User requests auto model
- **WHEN** a chat completion request is made with model `auto`
- **THEN** the system sends an empty string as `modelId` in `assistGenerationConfig`

#### Scenario: Auto-select response parsing
- **WHEN** the API responds using an auto-selected model
- **THEN** the system parses the response identically to any other model (same `streamAssistResponse` format)

### Requirement: Deprecated model removal
The system SHALL remove the `gemini-3-pro` → `gemini-3-pro-preview` convenience alias from the model map.

#### Scenario: User requests removed alias gemini-3-pro
- **WHEN** a chat completion request is made with model `gemini-3-pro`
- **THEN** the system passes `gemini-3-pro` through as-is to the API (no mapping applied)

### Requirement: Model passthrough for unknown models
The system SHALL pass any unrecognized model name directly to the API without modification.

#### Scenario: Unknown model name
- **WHEN** a chat completion request is made with an unrecognized model name
- **THEN** the system uses the provided name as `modelId` without mapping
