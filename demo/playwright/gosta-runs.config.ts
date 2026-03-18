import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'gosta-runs.spec.ts',
  timeout: 120_000,
  retries: 0,
  use: {
    // Terminal scenes only — no app server needed
    viewport: { width: 960, height: 600 },
    launchOptions: {
      slowMo: 100,
    },
  },
  reporter: [['html', { open: 'never' }]],
  outputDir: '../../test-results/demo',
});
