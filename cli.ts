#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AccountManager } from './src/account-manager.js';
import { GeminiBusinessAPI } from './src/gemini-business-api.js';
import { BrowserAuth } from './src/browser-auth.js';
import { GeminiBusinessAccount } from './src/types.js';

/**
 * CLI entry point - handles account management commands.
 */
export async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  const accountManager = new AccountManager();

  try {
    await accountManager.loadAccounts();
  } catch {
    // Config file might not exist yet - that's ok.
  }

  switch (command) {
    case 'add-account':
      await addAccountCommand(accountManager, args.slice(1));
      break;

    case 'list-accounts':
      await listAccountsCommand(accountManager);
      break;

    case 'remove-account':
      await removeAccountCommand(accountManager, args[1]);
      break;

    case 'test-account':
      await testAccountCommand(accountManager, args[1]);
      break;

    case 'help':
    default:
      printHelp();
      break;
  }
}

async function addAccountCommand(manager: AccountManager, args: string[]) {
  const isManual = args.includes('--manual');
  const filteredArgs = args.filter(a => a !== '--manual');

  if (isManual) {
    await addAccountManual(manager, filteredArgs);
  } else {
    await addAccountBrowser(manager, filteredArgs[0]);
  }
}

async function addAccountBrowser(manager: AccountManager, name?: string) {
  console.log('Add Gemini Business Account (Browser Flow)');
  console.log('--------------------------------------------');
  console.log('A Chrome window will open. Sign in to your Gemini Business account.\n');

  const auth = new BrowserAuth({
    name: name || `account-${Date.now()}`,
  });

  try {
    const credentials = await auth.captureCredentials((message) => {
      console.log(message);
    });

    const account: Omit<GeminiBusinessAccount, 'id'> = {
      name: name || `account-${Date.now()}`,
      team_id: credentials.team_id,
      cookies: credentials.cookies,
      csesidx: credentials.csesidx,
      user_agent: credentials.user_agent,
      enabled: true,
    };

    const id = await manager.addAccount(account);
    console.log(`\n✅ Account added successfully! ID: ${id}`);
    console.log(`   Name: ${account.name}`);
    console.log(`   Team ID: ${account.team_id}`);

    await ensureAuthRecord();
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function addAccountManual(manager: AccountManager, args: string[]) {
  console.log('Add Gemini Business Account (Manual)');
  console.log('-------------------------------------');

  const account: Omit<GeminiBusinessAccount, 'id'> = {
    name: args[0] || process.env.GEMINI_ACCOUNT_NAME || `account-${Date.now()}`,
    team_id: args[1] || process.env.GEMINI_TEAM_ID || '',
    cookies: {
      secure_c_ses: args[2] || process.env.GEMINI_SECURE_C_SES || '',
      host_c_oses: args[3] || process.env.GEMINI_HOST_C_OSES || '',
    },
    csesidx: args[4] || process.env.GEMINI_CSESIDX || '',
    user_agent: args[5] || process.env.GEMINI_USER_AGENT,
    enabled: true,
  };

  if (
    !account.team_id ||
    !account.cookies.secure_c_ses ||
    !account.cookies.host_c_oses ||
    !account.csesidx
  ) {
    console.error('Error: Missing required fields!');
    console.error('\nUsage:');
    console.error(
      '  opencode-gemini-business add-account --manual <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx> [user_agent]'
    );
    console.error('\nOr set environment variables:');
    console.error(
      '  GEMINI_ACCOUNT_NAME, GEMINI_TEAM_ID, GEMINI_SECURE_C_SES, GEMINI_HOST_C_OSES, GEMINI_CSESIDX, GEMINI_USER_AGENT'
    );
    process.exit(1);
  }

  const id = await manager.addAccount(account);
  console.log(`✅ Account added successfully! ID: ${id}`);
  console.log(`   Name: ${account.name}`);
  console.log(`   Team ID: ${account.team_id}`);

  await ensureAuthRecord();
}

/**
 * Ensure auth record exists in ~/.local/share/opencode/auth.json
 * so that OpenCode calls the plugin's loader() without manual `opencode auth login`.
 */
async function ensureAuthRecord() {
  const authDir = join(homedir(), '.local', 'share', 'opencode');
  const authPath = join(authDir, 'auth.json');

  let authData: Record<string, unknown> = {};

  try {
    const raw = await readFile(authPath, 'utf-8');
    authData = JSON.parse(raw);
  } catch {
    // File doesn't exist yet — we'll create it
  }

  if (authData['gemini-business']) {
    return; // Already registered
  }

  authData['gemini-business'] = { type: 'api', key: 'unused' };

  try {
    await mkdir(authDir, { recursive: true });
    await writeFile(authPath, JSON.stringify(authData, null, 2) + '\n', 'utf-8');
    console.log(`\n✅ Auth record created in ${authPath}`);
    console.log('   You can skip "opencode auth login" — the plugin is ready to use!');
  } catch (error) {
    console.warn(`\n⚠️  Could not auto-create auth record: ${error}`);
    console.warn('   Run "opencode auth login" and select gemini-business manually.');
  }
}

async function listAccountsCommand(manager: AccountManager) {
  const accounts = manager.getAccounts();

  if (accounts.length === 0) {
    console.log('No accounts configured.');
    return;
  }

  console.log(`Found ${accounts.length} account(s):\n`);

  accounts.forEach((account, index) => {
    console.log(`[${index + 1}] ${account.name} (${account.id})`);
    console.log(`    Team ID: ${account.team_id}`);
    console.log(`    Status: ${account.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`    Errors: ${account.error_count || 0}`);
    if (account.last_error) {
      console.log(`    Last Error: ${account.last_error}`);
    }
    if (account.last_used) {
      const lastUsed = new Date(account.last_used);
      console.log(`    Last Used: ${lastUsed.toISOString()}`);
    }
    console.log('');
  });
}

async function removeAccountCommand(
  manager: AccountManager,
  accountId: string
) {
  if (!accountId) {
    console.error('Error: Account ID required');
    console.error('Usage: opencode-gemini-business remove-account <account_id>');
    process.exit(1);
  }

  const removed = await manager.removeAccount(accountId);
  if (removed) {
    console.log(`✅ Account ${accountId} removed successfully`);
  } else {
    console.error(`❌ Account ${accountId} not found`);
    process.exit(1);
  }
}

async function testAccountCommand(manager: AccountManager, accountId: string) {
  if (!accountId) {
    console.error('Error: Account ID required');
    console.error('Usage: opencode-gemini-business test-account <account_id>');
    process.exit(1);
  }

  const accounts = manager.getAccounts();
  const account = accounts.find((acc) => acc.id === accountId);

  if (!account) {
    console.error(`❌ Account ${accountId} not found`);
    process.exit(1);
  }

  console.log(`Testing account: ${account.name} (${account.id})`);
  console.log('Please wait...\n');

  const api = new GeminiBusinessAPI(account);
  const result = await api.testAccount();

  if (result.success) {
    console.log('✅ Account test successful!');
    console.log('   XSRF Token: OK');
    console.log('   Session: OK');
    console.log('   Authentication: OK');
  } else {
    console.log('❌ Account test failed!');
    console.log(`   Error: ${result.error}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log('OpenCode Gemini Business Plugin');
  console.log('================================\n');
  console.log('Multi-account Gemini Business pool with automatic rotation\n');
  console.log('Commands:');
  console.log('  add-account [name]');
  console.log('    Add account via browser login (default). Opens Chrome, you sign in,');
  console.log('    credentials are captured automatically. Requires Chrome/Chromium.\n');
  console.log(
    '  add-account --manual <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx> [user_agent]'
  );
  console.log('    Add account manually by providing credentials as arguments.\n');
  console.log('  list-accounts');
  console.log('    List all configured accounts\n');
  console.log('  remove-account <account_id>');
  console.log('    Remove an account\n');
  console.log('  test-account <account_id>');
  console.log('    Test account credentials\n');
  console.log('  help');
  console.log('    Show this help message\n');
  console.log('Environment Variables (for --manual mode):');
  console.log('  GEMINI_ACCOUNT_NAME    - Account name');
  console.log('  GEMINI_TEAM_ID         - Team ID');
  console.log('  GEMINI_SECURE_C_SES    - __Secure-c_ses cookie');
  console.log('  GEMINI_HOST_C_OSES     - __Host-c_oses cookie');
  console.log('  GEMINI_CSESIDX         - csesidx value');
  console.log('  GEMINI_USER_AGENT      - Custom user agent (optional)\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
