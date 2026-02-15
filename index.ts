/**
 * OpenCode Gemini Business Plugin
 * Multi-account Gemini Business pool with automatic rotation
 */

import { AccountManager } from './src/account-manager.js';
import { GeminiBusinessAPI } from './src/gemini-business-api.js';

const GeminiBusinessPlugin = (_ctx: any) => {
  // Create account manager once per plugin instance.
  const accountManager = new AccountManager();

  return {
    auth: {
      provider: 'gemini-business',

      async loader(_getAuth: any, _provider: any) {
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
          accountCount: accounts.length,
          strategy: accountManager.getConfig().rotation_strategy,

          async fetch(_input: any, options: any): Promise<any> {
            try {
              const account = accountManager.getNextAccount();
              if (!account) {
                throw new Error('No available accounts');
              }

              const api = new GeminiBusinessAPI(account);

              if (api.needsSessionRefresh()) {
                console.log(`   ⟳ Refreshing session for: ${account.name}`);
                await api.refreshSession();
                await accountManager.updateSession(
                  account.id,
                  account.session_id!,
                  50 * 60 * 1000
                );
              }

              const requestBody = options?.body
                ? JSON.parse(options.body as string)
                : {};
              const response = await api.chatCompletion(requestBody);

              accountManager.resetAccountErrors(account.id);

              return new Response(JSON.stringify(response), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                },
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);

              const account = accountManager.getNextAccount();
              if (account) {
                accountManager.markAccountError(account.id, errorMessage);
              }

              throw new Error(`Gemini Business API Error: ${errorMessage}`);
            }
          },
        };
      },

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

export default GeminiBusinessPlugin;
