import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'../../../../tests', testMatch:'final-v10-integration.spec.mjs', fullyParallel:false, workers:1,
  reporter:[['list'],['json',{outputFile:new URL('./focused-results.json',import.meta.url).pathname}]],
  outputDir:new URL('./test-artifacts',import.meta.url).pathname,
  use:{browserName:'chromium',headless:true,viewport:{width:1400,height:1000}} });
