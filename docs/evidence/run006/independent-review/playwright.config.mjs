import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../../../tests',
  testMatch: 'independent-download-review.spec.mjs',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'docs/evidence/run006/independent-review/results.json' }]],
  outputDir: 'docs/evidence/run006/independent-review/artifacts',
  use: { browserName: 'chromium', headless: true, viewport: { width: 1280, height: 900 } },
});
