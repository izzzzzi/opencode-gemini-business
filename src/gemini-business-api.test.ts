import { describe, expect, it } from 'vitest';
import { GeminiBusinessAPI } from './gemini-business-api.js';
import { GeminiBusinessAccount } from './types.js';

const mockAccount: GeminiBusinessAccount = {
  id: 'test-1',
  name: 'Test Account',
  team_id: 'team-123',
  cookies: { secure_c_ses: 'test', host_c_oses: 'test' },
  csesidx: '1',
  enabled: true,
};

// Access private method for testing
function mapModelId(model?: string): string {
  const api = new GeminiBusinessAPI(mockAccount);
  return (api as any).mapModelId(model);
}

function convertToGeminiFormat(model: string): any {
  const api = new GeminiBusinessAPI(mockAccount);
  return (api as any).convertToGeminiFormat(
    { model, messages: [{ role: 'user', content: 'test' }] },
    'session-123'
  );
}

describe('mapModelId', () => {
  it('maps gemini-2.5-flash', () => {
    expect(mapModelId('gemini-2.5-flash')).toBe('gemini-2.5-flash');
  });

  it('maps gemini-2.5-pro', () => {
    expect(mapModelId('gemini-2.5-pro')).toBe('gemini-2.5-pro');
  });

  it('maps gemini-3-flash to preview', () => {
    expect(mapModelId('gemini-3-flash')).toBe('gemini-3-flash-preview');
  });

  it('maps gemini-3.1-pro to preview', () => {
    expect(mapModelId('gemini-3.1-pro')).toBe('gemini-3.1-pro-preview');
  });

  it('maps gemini-3.1-pro-preview as passthrough', () => {
    expect(mapModelId('gemini-3.1-pro-preview')).toBe('gemini-3.1-pro-preview');
  });

  it('maps auto to empty string', () => {
    expect(mapModelId('auto')).toBe('');
  });

  it('passes through gemini-3-pro unmapped (removed alias)', () => {
    expect(mapModelId('gemini-3-pro')).toBe('gemini-3-pro');
  });

  it('passes through unknown model names', () => {
    expect(mapModelId('some-future-model')).toBe('some-future-model');
  });

  it('defaults to gemini-2.5-flash when undefined', () => {
    expect(mapModelId(undefined)).toBe('gemini-2.5-flash');
  });
});

describe('convertToGeminiFormat auto-select', () => {
  it('omits modelId when auto is selected', () => {
    const result = convertToGeminiFormat('auto');
    expect(result.streamAssistRequest.assistGenerationConfig).toEqual({});
  });

  it('includes modelId for regular models', () => {
    const result = convertToGeminiFormat('gemini-2.5-pro');
    expect(result.streamAssistRequest.assistGenerationConfig).toEqual({
      modelId: 'gemini-2.5-pro',
    });
  });
});
