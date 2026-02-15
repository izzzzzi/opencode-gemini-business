#!/usr/bin/env node

/**
 * CLI entry point for opencode-gemini-business
 */

import('../dist/cli.js')
  .then(module => {
    if (module.cli) {
      return module.cli();
    } else {
      throw new Error('CLI function not found in module exports');
    }
  })
  .catch(error => {
    console.error('Failed to load CLI:', error);
    process.exit(1);
  });
