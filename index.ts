/**
 * OpenCode Gemini Business Plugin
 * Multi-account Gemini Business pool with automatic rotation
 */

import { AccountManager } from './src/account-manager.js';
import { GeminiBusinessAPI } from './src/gemini-business-api.js';

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Symbol.asyncIterator in (value as object)
  );
}

function toSSEStream(
  chunks: AsyncIterable<unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export const GeminiBusinessPlugin = async (_ctx: any) => {
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
          apiKey: '',

          async fetch(_input: any, init: any): Promise<any> {
            const config = accountManager.getConfig();
            let lastError: Error | null = null;

            for (let attempt = 0; attempt < config.max_retries; attempt++) {
              const account = accountManager.getNextAccount();
              if (!account) {
                throw new Error('No available accounts');
              }

              try {
                const api = new GeminiBusinessAPI(account);

                if (api.needsSessionRefresh()) {
                  await api.refreshSession();
                  await accountManager.updateSession(
                    account.id,
                    account.session_id!,
                    50 * 60 * 1000
                  );
                }

                const requestBody = init?.body
                  ? JSON.parse(init.body as string)
                  : {};
                const response = await api.chatCompletion(requestBody);

                accountManager.resetAccountErrors(account.id);

                if (requestBody.stream) {
                  if (!isAsyncIterable(response)) {
                    throw new Error(
                      'Provider returned non-stream response for stream request'
                    );
                  }

                  return new Response(toSSEStream(response), {
                    status: 200,
                    headers: {
                      'Content-Type': 'text/event-stream; charset=utf-8',
                      'Cache-Control': 'no-cache',
                      Connection: 'keep-alive',
                    },
                  });
                }

                return new Response(JSON.stringify(response), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);

                accountManager.markAccountError(account.id, errorMessage);
                lastError = error instanceof Error ? error : new Error(errorMessage);

                if (attempt < config.max_retries - 1) {
                  await new Promise((r) => setTimeout(r, config.retry_delay));
                }
              }
            }

            throw new Error(
              `Gemini Business API Error after ${config.max_retries} attempts: ${lastError?.message}`
            );
          },
        };
      },

      methods: [
        {
          type: 'api' as const,
          label: 'Gemini Business (enter any key)',
        },
      ],
    },
  };
};
