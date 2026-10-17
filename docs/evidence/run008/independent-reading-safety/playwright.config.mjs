export default {
  testDir: '../../../../tests', testMatch: 'independent-reading-safety.spec.mjs',
  fullyParallel: false, workers: 1, reporter: 'list',
  outputDir: './test-results', use: { browserName: 'chromium', headless: true, serviceWorkers: 'block', viewport: { width: 1440, height: 1050 } },
};
