#!/usr/bin/env node

/**
 * OpenCode Gemini Business Plugin
 * Multi-account Gemini Business pool with automatic rotation
 *
 * Follows OpenCode plugin patterns from:
 * - opencode-gemini-auth
 * - opencode-openai-codex-auth
 * - opencode-antigravity-auth
 */

import { AccountManager } from './src/account-manager.js';
import { GeminiBusinessAPI } from './src/gemini-business-api.js';
import { GeminiBusinessAccount } from './src/types.js';

// ============================================================================
// OpenCode Plugin Export
// ============================================================================

/**
 * OpenCode Plugin Entry Point
 *
 * This plugin doesn't use traditional OAuth - it uses cookie-based auth
 * with Gemini Business accounts configured via CLI.
 */
export const GeminiBusinessPlugin = (ctx: any) => {
  // Create account manager once for the plugin instance
  const accountManager = new AccountManager();

  return {
    auth: {
      provider: 'gemini-business',

      /**
       * Loader function - called by OpenCode to initialize the provider
       */
      async loader(getAuth: any, provider: any) {
        await accountManager.loadAccounts();

        const accounts = accountManager.getAccounts();
        if (accounts.length === 0) {
          console.error(
            '\n❌ No Gemini Business accounts configured!\n' +
            '\nTo add an account, run:\n' +
            '  opencode-gemini-business add-account\n' +
            '\nFor help, run:\n' +
            '  opencode-gemini-business help\n'
          );
          return {};
        }

        console.log(
          `\n✅ Gemini Business: Loaded ${accounts.length} account(s)\n` +
          `   Strategy: ${accountManager.getConfig().rotation_strategy}\n`
        );

        return {
          // Return empty config - we handle everything in custom fetch
          accountCount: accounts.length,
          strategy: accountManager.getConfig().rotation_strategy,

          /**
           * Custom fetch implementation for Gemini Business API
           *
           * This intercepts all OpenCode API calls and routes them through
           * the Gemini Business API with account rotation.
           */
          async fetch(input: any, options: any): Promise<any> {
            try {
              // Get next available account based on rotation strategy
              const account = accountManager.getNextAccount();
              if (!account) {
                throw new Error('No available accounts');
              }

              // Create API client for this account
              const api = new GeminiBusinessAPI(account);

              // Refresh session if needed
              if (api.needsSessionRefresh()) {
                console.log(`   ⟳ Refreshing session for: ${account.name}`);
                await api.refreshSession();
                await accountManager.updateSession(
                  account.id,
                  account.session_id!,
                  50 * 60 * 1000 // 50 minutes
                );
              }

              // Parse request body
              const requestBody = options?.body ? JSON.parse(options.body as string) : {};

              // Make API call
              const response = await api.chatCompletion(requestBody);

              // Success! Reset error count
              accountManager.resetAccountErrors(account.id);

              // Convert to Response object for OpenCode
              return new Response(JSON.stringify(response), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                },
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);

              // Mark account error
              const account = accountManager.getNextAccount();
              if (account) {
                accountManager.markAccountError(account.id, errorMessage);
              }

              // Rethrow for OpenCode to handle
              throw new Error(`Gemini Business API Error: ${errorMessage}`);
            }
          },
        };
      },

      /**
       * Authentication methods
       *
       * For Gemini Business, we don't support OAuth - accounts are configured
       * via CLI with cookie extraction from browser.
       */
      methods: [
        {
          type: 'cookie' as const,
          label: 'Gemini Business Cookie Auth',
          authorize: async () => ({
            type: 'instructions' as const,
            instructions:
              '📋 To configure Gemini Business accounts:\n\n' +
              '1. Login to https://business.gemini.google\n' +
              '2. Open DevTools (F12) → Network tab\n' +
              '3. Make any API request (refresh page or send a prompt)\n' +
              '4. Find request headers and copy:\n' +
              '   • team_id (from X-Goog-Team-Id header)\n' +
              '   • __Secure-c_ses cookie\n' +
              '   • __Host-c_oses cookie\n' +
              '   • csesidx value\n\n' +
              '5. Run: opencode-gemini-business add-account\n' +
              '   Or use environment variables (see docs)\n\n' +
              'For more help: opencode-gemini-business help',
          }),
        },
      ],
    },
  };
};

// Export as default for CommonJS compatibility
export default GeminiBusinessPlugin;

// Export legacy functions for backward compatibility (if needed)
export { AccountManager, GeminiBusinessAPI };

// ============================================================================
// CLI Commands
// ============================================================================

/**
 * CLI entry point - handles account management commands
 */
async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  const accountManager = new AccountManager();

  try {
    await accountManager.loadAccounts();
  } catch {
    // Config file might not exist yet - that's ok
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

/**
 * Add account command
 */
async function addAccountCommand(manager: AccountManager, args: string[]) {
  console.log('Add Gemini Business Account');
  console.log('----------------------------');

  // Read from command line args or env vars
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
  console.log('  GEMINI_SECURE_C_SES    - __Secure-c_ses cookie');
  console.log('  GEMINI_HOST_C_OSES     - __Host-c_oses cookie');
  console.log('  GEMINI_CSESIDX         - csesidx value');
  console.log('  GEMINI_USER_AGENT      - Custom user agent (optional)\n');
}

// Export CLI function
export { cli };

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
