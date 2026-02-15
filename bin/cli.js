#!/usr/bin/env node

/**
 * CLI entry point for opencode-gemini-business
 */

import('../index.js').catch(error => {
  console.error('Failed to load CLI:', error);
  process.exit(1);
});
