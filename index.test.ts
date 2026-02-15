import { describe, expect, it } from 'vitest';

import * as entry from './index.js';

describe('plugin entrypoint exports', () => {
  it('exports named GeminiBusinessPlugin factory', () => {
    expect(Object.keys(entry)).toEqual(['GeminiBusinessPlugin']);
    expect(typeof entry.GeminiBusinessPlugin).toBe('function');
  });

  it('GeminiBusinessPlugin returns plugin shape', async () => {
    const plugin = await entry.GeminiBusinessPlugin({});
    expect(plugin).toHaveProperty('auth.provider', 'gemini-business');
    expect(typeof plugin.auth.loader).toBe('function');
  });
});
