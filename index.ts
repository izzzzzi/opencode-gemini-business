#!/usr/bin/env node

/**
 * OpenCode Gemini Business Plugin
 * Multi-account Gemini Business pool with automatic rotation
 */

import { createProvider, OpenCodeGeminiBusinessProvider } from './src/opencode-provider.js';
import { AccountManager } from './src/account-manager.js';
import { GeminiBusinessAccount } from './src/types.js';

// Main provider instance
let provider: OpenCodeGeminiBusinessProvider | null = null;

/**
 * Initialize the plugin
 */
export async function initialize() {
  if (!provider) {
    provider = await createProvider();
  }
  return provider;
}

/**
 * Chat completion handler (called by OpenCode)
 */
export async function chatCompletion(request: any) {
  if (!provider) {
    provider = await createProvider();
  }

  return await provider.chatCompletion(request);
}

/**
 * List models handler (called by OpenCode)
 */
export async function listModels() {
  if (!provider) {
    provider = await createProvider();
  }

  return await provider.listModels();
}

/**
 * CLI Commands
 */
async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  const accountManager = new AccountManager();
  await accountManager.loadAccounts();

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

/**
 * Add account command
 */
async function addAccountCommand(manager: AccountManager, args: string[]) {
  console.log('Add Gemini Business Account');
  console.log('----------------------------');

  // For now, we'll read from command line args or env vars
  // In production, this could be interactive or read from a file
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

  // Validate required fields
  if (!account.team_id || !account.cookies.secure_c_ses || !account.cookies.host_c_oses || !account.csesidx) {
    console.error('Error: Missing required fields!');
    console.error('\nUsage:');
    console.error('  opencode-gemini-business add-account <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx> [user_agent]');
    console.error('\nOr set environment variables:');
    console.error('  GEMINI_ACCOUNT_NAME, GEMINI_TEAM_ID, GEMINI_SECURE_C_SES, GEMINI_HOST_C_OSES, GEMINI_CSESIDX, GEMINI_USER_AGENT');
    process.exit(1);
  }

  const id = await manager.addAccount(account);
  console.log(`✅ Account added successfully! ID: ${id}`);
  console.log(`   Name: ${account.name}`);
  console.log(`   Team ID: ${account.team_id}`);
}

/**
 * List accounts command
 */
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

/**
 * Remove account command
 */
async function removeAccountCommand(manager: AccountManager, accountId: string) {
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

/**
 * Test account command
 */
async function testAccountCommand(manager: AccountManager, accountId: string) {
  if (!accountId) {
    console.error('Error: Account ID required');
    console.error('Usage: opencode-gemini-business test-account <account_id>');
    process.exit(1);
  }

  const accounts = manager.getAccounts();
  const account = accounts.find(acc => acc.id === accountId);

  if (!account) {
    console.error(`❌ Account ${accountId} not found`);
    process.exit(1);
  }

  console.log(`Testing account: ${account.name} (${account.id})`);
  console.log('Please wait...\n');

  const { GeminiBusinessProvider } = await import('./src/gemini-provider.js');
  const provider = new GeminiBusinessProvider(account);
  const result = await provider.testAccount();

  if (result.success) {
    console.log('✅ Account test successful!');
    console.log('   Connection: OK');
    console.log('   Authentication: OK');
  } else {
    console.log('❌ Account test failed!');
    console.log(`   Error: ${result.error}`);
    process.exit(1);
  }
}

/**
 * Print help
 */
function printHelp() {
  console.log('OpenCode Gemini Business Plugin');
  console.log('================================\n');
  console.log('Multi-account Gemini Business pool with automatic rotation\n');
  console.log('Commands:');
  console.log('  add-account <name> <team_id> <secure_c_ses> <host_c_oses> <csesidx> [user_agent]');
  console.log('    Add a new Gemini Business account\n');
  console.log('  list-accounts');
  console.log('    List all configured accounts\n');
  console.log('  remove-account <account_id>');
  console.log('    Remove an account\n');
  console.log('  test-account <account_id>');
  console.log('    Test account credentials\n');
  console.log('  help');
  console.log('    Show this help message\n');
  console.log('Environment Variables:');
  console.log('  GEMINI_ACCOUNT_NAME    - Account name');
  console.log('  GEMINI_TEAM_ID         - Team ID');
  console.log('  GEMINI_SECURE_C_SES    - Secure session cookie');
  console.log('  GEMINI_HOST_C_OSES     - Host session cookie');
  console.log('  GEMINI_CSESIDX         - Session index');
  console.log('  GEMINI_USER_AGENT      - Custom user agent (optional)\n');
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

// Export for OpenCode
export default {
  initialize,
  chatCompletion,
  listModels,
};
