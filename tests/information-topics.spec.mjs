import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let bundle;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: "export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {isCandidateCurrent} from './src/page-session';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'InformationTopics' });
  bundle = result.outputFiles[0].text;
});
async function classify(page, body) {
  await page.setContent(`<main><h1>공개 정보</h1>${body}</main>`);
  await page.addScriptTag({ content: bundle });
  return page.evaluate(() => InformationTopics.classify(InformationTopics.analyzePage()).map(candidate => ({ id: candidate.element.id, category: candidate.category, action: candidate.action, label: candidate.label })));
}

test('독립된 두 정보 설명 항목과 원본 주제 제어가 있을 때만 짧은 목록의 의미를 보완한다', async ({ page }) => {
  const actual = await classify(page, '<ul><li><a id="topic" href="#topic">실무 참고</a></li><li><a id="types" href="#types">항목의 종류</a></li><li><a id="criteria" href="#criteria">보관 기준</a></li><li><a id="apply" href="https://example.test/apply">시설 신청</a></li><li><a id="delete" href="javascript:deleteRecord();">삭제</a></li></ul>');
  expect(actual.filter(candidate => ['topic','types','criteria'].includes(candidate.id)).map(candidate => [candidate.id, candidate.category, candidate.action])).toEqual([['topic','help','locate'],['types','help','locate'],['criteria','help','locate']]);
  expect(actual.find(candidate => candidate.id === 'apply').category).toBe('apply');
  expect(actual.some(candidate => candidate.id === 'delete')).toBe(false);
});

test('정보 명사 한 개나 편집된 동료 텍스트만으로 목록 전체를 도움말로 만들지 않는다', async ({ page }) => {
  const actual = await classify(page, '<ul><li><a id="topic" href="#topic">실무 참고</a></li><li><a href="#types">항목의 종류</a></li><li><a href="#criteria" contenteditable="true">PRIVATE_SENTINEL 보관 기준</a></li></ul><form><ul><li><button>항목의 종류</button></li><li><button>보관 기준</button></li></ul></form>');
  expect(actual).toEqual([]);
});

test('동료의 두 번째 정보 근거가 사라지면 원본 주제의 이전 snapshot을 무효화한다', async ({ page }) => {
  await classify(page, '<ul><li><a id="topic" href="#topic">실무 참고</a></li><li><a href="#types">항목의 종류</a></li><li id="peer"><a href="#criteria">보관 기준</a></li></ul>');
  await page.evaluate(() => { window.savedTopic = InformationTopics.classify(InformationTopics.analyzePage()).find(candidate => candidate.element.id === 'topic'); });
  expect(await page.evaluate(() => InformationTopics.isCandidateCurrent(savedTopic))).toBe(true);
  await page.locator('#peer').evaluate(element => { element.hidden = true; });
  expect(await page.evaluate(() => InformationTopics.isCandidateCurrent(savedTopic))).toBe(false);
});
