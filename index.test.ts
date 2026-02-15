import { describe, expect, it } from 'vitest';

import * as entry from './index.js';

describe('plugin entrypoint exports', () => {
  it('exports only default plugin factory', () => {
    expect(Object.keys(entry)).toEqual(['default']);
    expect(typeof entry.default).toBe('function');
  });

  it('default export returns plugin shape', () => {
    const plugin = entry.default({});
    expect(plugin).toHaveProperty('auth.provider', 'gemini-business');
    expect(typeof plugin.auth.loader).toBe('function');
  });
});
