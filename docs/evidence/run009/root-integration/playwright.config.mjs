import {defineConfig} from '@playwright/test';
import path from 'node:path';
export default defineConfig({testDir:path.resolve('tests'),testMatch:['content-query-v10.spec.mjs','menu-source-identity.spec.mjs'],workers:1,fullyParallel:false,reporter:'list',use:{browserName:'chromium',headless:true,viewport:{width:1440,height:1050}}});
