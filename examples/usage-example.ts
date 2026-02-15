/**
 * Usage Examples for OpenCode Gemini Business Plugin
 */

import { initialize, chatCompletion, listModels } from '../index.js';
import { AccountManager } from '../src/account-manager.js';
import { GeminiBusinessProvider } from '../src/gemini-provider.js';

// Example 1: Basic Usage with OpenCode
async function basicUsage() {
  console.log('=== Basic Usage ===\n');

  // Initialize the plugin
  const provider = await initialize();

  // Simple chat completion
  const response = await chatCompletion({
    model: 'gemini-2.5-pro',
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ]
  });

  console.log('Response:', response.choices[0].message?.content);
}

// Example 2: Streaming Response
async function streamingUsage() {
  console.log('\n=== Streaming Usage ===\n');

  const provider = await initialize();

  const stream = await chatCompletion({
    model: 'gemini-2.5-pro',
    messages: [
      { role: 'user', content: 'Write a short poem about coding' }
    ],
    stream: true
  });

  if (Symbol.asyncIterator in Object(stream)) {
    for await (const chunk of stream as AsyncIterable<any>) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
    console.log('\n');
  }
}

// Example 3: Multi-turn Conversation
async function conversationUsage() {
  console.log('\n=== Conversation Usage ===\n');

  const provider = await initialize();

  const messages = [
    { role: 'user', content: 'Hello! Can you help me with Python?' },
    { role: 'assistant', content: 'Of course! I\'d be happy to help you with Python. What would you like to know?' },
    { role: 'user', content: 'How do I read a file in Python?' }
  ];

  const response = await chatCompletion({
    model: 'gemini-2.5-pro',
    messages,
    temperature: 0.7
  });

  console.log('Response:', response.choices[0].message?.content);
}

// Example 4: List Available Models
async function listModelsUsage() {
  console.log('\n=== List Models ===\n');

  const models = await listModels();

  console.log(`Found ${models.length} models:`);
  models.forEach(model => {
    console.log(`- ${model.id} (${model.owned_by})`);
  });
}

// Example 5: Account Management
async function accountManagement() {
  console.log('\n=== Account Management ===\n');

  const manager = new AccountManager();
  await manager.loadAccounts();

  // Get accounts
  const accounts = manager.getAccounts();
  console.log(`Total accounts: ${accounts.length}`);

  // Get config
  const config = manager.getConfig();
  console.log(`Rotation strategy: ${config.rotation_strategy}`);
  console.log(`Max retries: ${config.max_retries}`);
  console.log(`Error threshold: ${config.error_threshold}`);

  // Get next account
  const nextAccount = manager.getNextAccount();
  if (nextAccount) {
    console.log(`\nNext account: ${nextAccount.name}`);
    console.log(`Team ID: ${nextAccount.team_id}`);
    console.log(`Enabled: ${nextAccount.enabled}`);
    console.log(`Errors: ${nextAccount.error_count || 0}`);
  }
}

// Example 6: Add Account Programmatically
async function addAccountProgrammatically() {
  console.log('\n=== Add Account Programmatically ===\n');

  const manager = new AccountManager();
  await manager.loadAccounts();

  const accountId = await manager.addAccount({
    name: 'New Account',
    team_id: 'team_example123',
    cookies: {
      secure_c_ses: 'example_secure_cookie',
      host_c_oses: 'example_host_cookie'
    },
    csesidx: 'example_csesidx',
    enabled: true
  });

  console.log(`Account added with ID: ${accountId}`);
}

// Example 7: Test Account
async function testAccountExample() {
  console.log('\n=== Test Account ===\n');

  const manager = new AccountManager();
  await manager.loadAccounts();

  const accounts = manager.getAccounts();
  if (accounts.length === 0) {
    console.log('No accounts to test');
    return;
  }

  const account = accounts[0];
  console.log(`Testing account: ${account.name}`);

  const provider = new GeminiBusinessProvider(account);
  const result = await provider.testAccount();

  if (result.success) {
    console.log('✅ Test successful!');
  } else {
    console.log(`❌ Test failed: ${result.error}`);
  }
}

// Example 8: Error Handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling ===\n');

  try {
    const provider = await initialize();

    const response = await chatCompletion({
      model: 'gemini-2.5-pro',
      messages: [
        { role: 'user', content: 'Hello!' }
      ]
    });

    console.log('Success:', response.choices[0].message?.content);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error occurred:', error.message);

      // Check error type
      if (error.message.includes('No available accounts')) {
        console.error('→ All accounts are disabled. Check account health.');
      } else if (error.message.includes('JWT refresh failed')) {
        console.error('→ Authentication failed. Update credentials.');
      } else if (error.message.includes('429')) {
        console.error('→ Rate limit hit. Plugin will auto-retry with next account.');
      } else {
        console.error('→ Unexpected error occurred.');
      }
    }
  }
}

// Example 9: Multimodal (Text + Image)
async function multimodalUsage() {
  console.log('\n=== Multimodal Usage ===\n');

  const provider = await initialize();

  const response = await chatCompletion({
    model: 'gemini-2.5-pro',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What do you see in this image?' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            }
          }
        ]
      }
    ]
  });

  console.log('Response:', response.choices[0].message?.content);
}

// Example 10: Configuration Options
async function configurationExample() {
  console.log('\n=== Configuration Example ===\n');

  // Create manager with custom config
  const manager = new AccountManager({
    rotation_strategy: 'least-used',
    max_retries: 5,
    retry_delay: 2000,
    jwt_refresh_threshold: 600, // 10 minutes
    error_threshold: 5
  });

  await manager.loadAccounts();

  const config = manager.getConfig();
  console.log('Configuration:');
  console.log(JSON.stringify(config, null, 2));
}

// Run all examples
async function runAllExamples() {
  try {
    await basicUsage();
    await streamingUsage();
    await conversationUsage();
    await listModelsUsage();
    await accountManagement();
    // await addAccountProgrammatically(); // Commented to avoid adding test accounts
    await testAccountExample();
    await errorHandlingExample();
    await multimodalUsage();
    await configurationExample();

    console.log('\n=== All examples completed ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  basicUsage,
  streamingUsage,
  conversationUsage,
  listModelsUsage,
  accountManagement,
  addAccountProgrammatically,
  testAccountExample,
  errorHandlingExample,
  multimodalUsage,
  configurationExample
};
