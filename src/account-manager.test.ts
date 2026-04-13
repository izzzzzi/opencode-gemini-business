import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccountManager } from './account-manager.js';
import { writeFile, readFile, mkdir } from 'fs/promises';

// Mock fs to avoid touching real filesystem
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn(),
}));
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

describe('AccountManager', () => {
  let manager: AccountManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AccountManager();
  });

  describe('markAccountError persists on threshold', () => {
    it('saves accounts when error threshold disables an account', async () => {
      const account = {
        name: 'test',
        team_id: 'team-1',
        cookies: { secure_c_ses: 'a', host_c_oses: 'b' },
        csesidx: '1',
        enabled: true,
      };
      const id = await manager.addAccount(account);
      vi.mocked(writeFile).mockClear();

      // Hit error threshold (default: 3)
      manager.markAccountError(id, 'fail 1');
      manager.markAccountError(id, 'fail 2');
      manager.markAccountError(id, 'fail 3');

      // Should have triggered saveAccounts on the 3rd error
      expect(writeFile).toHaveBeenCalled();
    });
  });

  describe('getNextAccount', () => {
    it('returns null when no accounts exist', () => {
      expect(manager.getNextAccount()).toBeNull();
    });

    it('round-robin rotates through enabled accounts', async () => {
      await manager.addAccount({
        name: 'a', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
        csesidx: '1', enabled: true,
      });
      await manager.addAccount({
        name: 'b', team_id: 't2', cookies: { secure_c_ses: '2', host_c_oses: '2' },
        csesidx: '2', enabled: true,
      });

      const first = manager.getNextAccount();
      const second = manager.getNextAccount();
      const third = manager.getNextAccount();

      expect(first?.name).toBe('a');
      expect(second?.name).toBe('b');
      expect(third?.name).toBe('a');
    });

    it('skips disabled accounts', async () => {
      await manager.addAccount({
        name: 'disabled', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
        csesidx: '1', enabled: false,
      });
      await manager.addAccount({
        name: 'enabled', team_id: 't2', cookies: { secure_c_ses: '2', host_c_oses: '2' },
        csesidx: '2', enabled: true,
      });

      const result = manager.getNextAccount();
      expect(result?.name).toBe('enabled');
    });
  });

  describe('resetAccountErrors', () => {
    it('resets error count and last_error', async () => {
      const id = await manager.addAccount({
        name: 'test', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
        csesidx: '1', enabled: true,
      });

      manager.markAccountError(id, 'some error');
      manager.resetAccountErrors(id);

      const account = manager.getAccounts().find(a => a.id === id);
      expect(account?.error_count).toBe(0);
      expect(account?.last_error).toBeUndefined();
    });
  });

  describe('error threshold disabling', () => {
    it('disables account after reaching error_threshold', async () => {
      const id = await manager.addAccount({
        name: 'test', team_id: 't1', cookies: { secure_c_ses: '1', host_c_oses: '1' },
        csesidx: '1', enabled: true,
      });

      manager.markAccountError(id, 'err 1');
      manager.markAccountError(id, 'err 2');

      let account = manager.getAccounts().find(a => a.id === id);
      expect(account?.enabled).toBe(true);

      manager.markAccountError(id, 'err 3');

      account = manager.getAccounts().find(a => a.id === id);
      expect(account?.enabled).toBe(false);
    });
  });
});
