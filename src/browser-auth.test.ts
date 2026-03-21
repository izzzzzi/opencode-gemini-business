import { describe, expect, it, vi } from 'vitest';
import { BrowserAuth } from './browser-auth.js';

// Mock chrome-launcher
vi.mock('chrome-launcher', () => ({
  Launcher: {
    getInstallations: vi.fn(),
  },
}));

// Mock puppeteer-core (not used in findChrome tests, but needed for import)
vi.mock('puppeteer-core', () => ({
  default: { launch: vi.fn() },
}));

import * as ChromeLauncher from 'chrome-launcher';

describe('BrowserAuth.findChrome()', () => {
  it('returns Chrome path when found', () => {
    vi.mocked(ChromeLauncher.Launcher.getInstallations).mockReturnValue([
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ]);

    const auth = new BrowserAuth();
    const path = auth.findChrome();
    expect(path).toBe('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  });

  it('throws descriptive error when Chrome not found', () => {
    vi.mocked(ChromeLauncher.Launcher.getInstallations).mockReturnValue([]);

    const auth = new BrowserAuth();
    expect(() => auth.findChrome()).toThrow('Google Chrome not found');
  });

  it('error message includes install link', () => {
    vi.mocked(ChromeLauncher.Launcher.getInstallations).mockReturnValue([]);

    const auth = new BrowserAuth();
    expect(() => auth.findChrome()).toThrow('https://www.google.com/chrome/');
  });

  it('error message includes --manual fallback', () => {
    vi.mocked(ChromeLauncher.Launcher.getInstallations).mockReturnValue([]);

    const auth = new BrowserAuth();
    expect(() => auth.findChrome()).toThrow('--manual');
  });

  it('returns first installation when multiple found', () => {
    vi.mocked(ChromeLauncher.Launcher.getInstallations).mockReturnValue([
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ]);

    const auth = new BrowserAuth();
    expect(auth.findChrome()).toBe('/usr/bin/google-chrome');
  });
});

describe('BrowserAuth constructor', () => {
  it('accepts custom timeout options', () => {
    const auth = new BrowserAuth({ timeout: 5000 });
    // Verify it constructs without error
    expect(auth).toBeInstanceOf(BrowserAuth);
  });

  it('accepts empty options', () => {
    const auth = new BrowserAuth();
    expect(auth).toBeInstanceOf(BrowserAuth);
  });
});
