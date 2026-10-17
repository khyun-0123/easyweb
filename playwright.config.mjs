import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true, viewport: { width: 1440, height: 1050 }, screenshot: 'only-on-failure' },
  webServer: {
    command: 'node scripts/serve-demo.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
