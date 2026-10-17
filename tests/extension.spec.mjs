import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('실제 확장 서비스 워커 로딩 및 로컬 페이지 주입', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'easyweb-extension-test-'));
  let context;
  try {
    const extension = join(temp, 'extension');
    await cp(resolve('dist'), extension, { recursive: true });
    const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
    // 자동화는 사용자 클릭에 의한 activeTab 허가를 재현하지 않습니다.
    // 테스트 복사본에 localhost만 허용하여 실제 Chrome scripting 파이프라인을 검증합니다.
    manifest.host_permissions = ['http://127.0.0.1/*'];
    await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
    context = await chromium.launchPersistentContext(join(temp, 'profile'), {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    expect(worker.url()).toMatch(/^chrome-extension:\/\/.+\/background.js$/);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    const tabId = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
      const id = tabs[0].id;
      await chrome.scripting.executeScript({ target: { tabId: id }, files: ['content.js'] });
      return id;
    });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(6);
    await worker.evaluate(async id => { await chrome.scripting.executeScript({ target: { tabId: id }, files: ['content.js'] }); }, tabId);
    await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  } finally {
    await context?.close();
    await rm(temp, { recursive: true, force: true });
  }
});
