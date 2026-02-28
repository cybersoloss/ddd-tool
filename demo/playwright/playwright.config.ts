import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testIgnore: ['feature-preview.spec.ts'],
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    video: { mode: 'on', size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      slowMo: 100, // Slight delay for natural-looking video
    },
  },
  webServer: {
    command: 'VITE_DEMO_MODE=true npx vite --port 4173',
    port: 4173,
    cwd: '../..',
    reuseExistingServer: true,
    timeout: 15_000,
  },
  reporter: [['html', { open: 'never' }]],
  outputDir: '../../test-results/demo',
});
