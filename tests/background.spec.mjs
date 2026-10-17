import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('도구 모음 실행 시 주입, 실패 시 안내 배지 표시', async () => {
  const code = await readFile('dist/background.js', 'utf8');
  let listener;
  let fail = false;
  const calls = [];
  const chrome = {
    action: {
      onClicked: { addListener: fn => { listener = fn; } },
      setBadgeText: async args => calls.push(['badge', args]),
      setBadgeBackgroundColor: async args => calls.push(['color', args]),
      setTitle: async args => calls.push(['title', args]),
    },
    scripting: { executeScript: async args => {
      calls.push(['inject', args]);
      if (fail) throw new Error('permission denied');
    } },
  };
  vm.runInNewContext(code, { chrome });
  await listener({ id: 10 });
  expect(calls[0][0]).toBe('inject');
  expect(calls[0][1].target.tabId).toBe(10);
  expect(calls[0][1].files).toEqual(['content.js']);
  fail = true;
  calls.length = 0;
  await listener({ id: 11 });
  expect(calls.find(x => x[0] === 'badge')[1].text).toBe('!');
  expect(calls.find(x => x[0] === 'title')[1].title).toContain('일반 웹사이트');
});
