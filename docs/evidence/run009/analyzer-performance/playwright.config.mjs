import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../../../../tests',
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: './focused-tests.json' }]],
  outputDir: './test-artifacts',
  use: { browserName: 'chromium', headless: true, viewport: { width: 1440, height: 1080 } },
});
