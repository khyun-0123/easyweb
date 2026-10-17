import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  testDir: path.resolve(directory, '../../../../tests'),
  testMatch: 'document-relations.spec.mjs',
  outputDir: path.join(directory, 'test-artifacts'),
  fullyParallel: false, workers: 1,
  reporter: [['list'], ['json', { outputFile: path.join(directory, 'focused-results.json') }]],
  use: { browserName: 'chromium', headless: true, viewport: { width: 1440, height: 1050 } },
});
