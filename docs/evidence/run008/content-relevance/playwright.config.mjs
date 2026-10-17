import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../../../../tests',
  workers: 1,
  fullyParallel: false,
  outputDir: './test-output',
  reporter: [['list']],
  use: { browserName: 'chromium', headless: true, viewport: { width: 1440, height: 1050 } },
});
