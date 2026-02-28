import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'feature-preview.spec.ts',
  timeout: 180_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4174',
    video: { mode: 'on', size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      slowMo: 100,
    },
  },
  webServer: {
    command: 'VITE_DEMO_MODE=true VITE_DEMO_PROJECT=vantage npx vite --port 4174',
    port: 4174,
    cwd: '../..',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  reporter: [['html', { open: 'never' }]],
  outputDir: '../../test-results/demo',
});
