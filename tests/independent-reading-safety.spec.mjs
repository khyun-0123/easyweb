import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

// Every page is synthetic. Route fulfillment below permits no public request.
let engine;
test.beforeAll(async () => {
  const root = process.env.EASYWEB_INDEPENDENT_ENGINE_ROOT ?? './src';
  const result = await build({ stdin: { contents: `export {analyzePage,supplementalEvidence} from '${root}/analyzer';export {classify} from '${root}/classifier';export {isCandidateCurrent} from '${root}/page-session';export {openEasyMode} from '${root}/easy-mode';export {locateOriginal} from '${root}/action-bridge';export {rank,remainingMenus} from '${root}/ranker';`, resolveDir: process.cwd() },
    bundle: true, write: false, metafile: true, format: 'iife', globalName: 'IndependentReading', loader: { '.css': 'text' } });
  engine = result.outputFiles[0].text;
  if (process.env.EASYWEB_INDEPENDENT_BUNDLE_META) await writeFile(process.env.EASYWEB_INDEPENDENT_BUNDLE_META,
    JSON.stringify({ inputs: Object.keys(result.metafile.inputs), sourceBytes: engine.length }, null, 2) + '\n');
});

const npsURL = 'https://www.nps.or.kr/pnsinfo/ntpsklg/unfamiliar-explanation.do';
const genericURL = 'https://unknown-campus.example.invalid/course/overview.html';
const label = '공용 보험료 납부기간';
function panelPage({ body = '', title = label, extra = '', href = '#explanation-one' } = {}) {
  return `<main><h2>공개 보험료 제도 안내</h2><div class="tabWrap con-tab" id="explanation-wrap"><ul class="tabNav" id="topic-list"><li id="topic-item"><a id="deadline" href="${href}" ${extra}>${title}</a></li><li><a id="topic-two" href="#explanation-two">보험료 산정기준</a></li></ul><div class="tabContents" id="explanation-container"><div class="tabPage" id="explanation-one"><h4 id="explanation-title"><span id="heading-piece">${title}</span></h4>${body}</div><div class="tabPage" id="explanation-two" hidden><h4>보험료 산정기준</h4></div></div></div></main>`;
}
async function setup(page, html, url = npsURL) {
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }) : route.abort());
  await page.goto(url);
  await page.addScriptTag({ content: engine });
}
async function inspect(page) {
  return page.evaluate(() => {
    window.independentSources = IndependentReading.analyzePage();
    window.independentCandidates = IndependentReading.classify(independentSources);
    return independentCandidates.map(c => ({ id: c.element.id, label: c.label, action: c.action, href: c.href, target: c.target,
      category: c.category, task: c.pageTask, readonlyPanel: c.institutionEvidence?.readonlyPanel, content: c.contentEvidence?.level }));
  });
}

for (const role of ['link', 'checkbox', 'radio', 'switch', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem'])
  test(`@readonly-semantics ARIA ${role} without handlers is not a readonly explanation`, async ({ page }) => {
    await setup(page, panelPage({ body: `<div role="${role}" aria-label="보험료 결제 업무">선택</div>` }));
    expect((await inspect(page)).some(c => c.id === 'deadline')).toBe(false);
  });

test('@identity a replaced local list item invalidates the old proof even with the original anchor', async ({ page }) => {
  await setup(page, panelPage());
  expect((await inspect(page)).some(c => c.id === 'deadline')).toBe(true);
  expect(await page.evaluate(() => {
    const c = independentCandidates.find(c => c.element.id === 'deadline');
    const item = document.querySelector('#topic-item'), clone = item.cloneNode(false);
    item.replaceWith(clone); clone.append(...item.childNodes);
    return IndependentReading.isCandidateCurrent(c);
  })).toBe(false);
});

test('@identity a replaced heading child invalidates the old proof with unchanged markup and name', async ({ page }) => {
  await setup(page, panelPage());
  expect((await inspect(page)).some(c => c.id === 'deadline')).toBe(true);
  expect(await page.evaluate(() => {
    const c = independentCandidates.find(c => c.element.id === 'deadline');
    const piece = document.querySelector('#heading-piece'); piece.replaceWith(piece.cloneNode(true));
    return IndependentReading.isCandidateCurrent(c);
  })).toBe(false);
});

test('@generic-identity a replaced generic editorial heading child invalidates its document-group proof', async ({ page }) => {
  await setup(page, `<main><h2 id="content-topic"><span id="content-topic-piece">학사안내</span></h2><ul><li class="active"><a href="/course/overview.html">학사안내</a></li><li><a id="document-one" href="/reading/one.html">융합전공 운영편람</a></li><li><a id="document-two" href="/reading/two.html">공동학위 안내책자</a></li></ul></main>`, genericURL);
  expect((await inspect(page)).find(c => c.id === 'document-one')).toMatchObject({ category: 'academic', task: 'reading', content: 2 });
  expect(await page.evaluate(() => {
    const candidate = independentCandidates.find(c => c.element.id === 'document-one');
    const before = IndependentReading.isCandidateCurrent(candidate);
    const node = document.querySelector('#content-topic-piece'); node.replaceWith(node.cloneNode(true));
    return { before, after: IndependentReading.isCandidateCurrent(candidate) };
  })).toEqual({ before: true, after: false });
});

const genericDocuments = (decoration = '') => `<main><h2 id="content-topic"><span>학사안내</span>${decoration}</h2><ul><li class="active"><a href="/course/overview.html">학사안내</a></li><li><a id="document-one" href="/reading/one.html">융합전공 운영편람</a></li><li><a id="document-two" href="/reading/two.html">공동학위 안내책자</a></li></ul></main>`;

test('SVG heading decoration replacement invalidates both institutional and generic source proofs', async ({ page }) => {
  const decoration = '<svg aria-hidden="true"><g><path id="proof-shape" d="M0 0h1v1z"></path></g></svg>';
  for (const kind of ['institution', 'generic']) {
    await setup(page, kind === 'institution' ? panelPage().replace('</h4>', `${decoration}</h4>`) : genericDocuments(decoration), kind === 'institution' ? npsURL : genericURL);
    const rows = await inspect(page), id = kind === 'institution' ? 'deadline' : 'document-one';
    expect(rows.find(c => c.id === id)).toBeTruthy();
    expect(await page.evaluate(id => {
      const candidate = independentCandidates.find(c => c.element.id === id), node = document.querySelector('#proof-shape');
      const before = IndependentReading.isCandidateCurrent(candidate);
      node.replaceWith(node.cloneNode(true));
      return { before, after: IndependentReading.isCandidateCurrent(candidate) };
    }, id)).toEqual({ before: true, after: false });
  }
});

test('an overbound decorated heading abstains from new reading proof while retaining ordinary source metadata', async ({ page }) => {
  const decoration = '<span aria-hidden="true"></span>'.repeat(65);
  await setup(page, panelPage().replace('</h4>', `${decoration}</h4>`));
  expect((await inspect(page)).some(c => c.id === 'deadline')).toBe(false);
  await setup(page, genericDocuments(decoration), genericURL);
  expect((await inspect(page)).find(c => c.id === 'document-one')).toMatchObject({ category: 'academic', action: 'navigate' });
  expect(await page.evaluate(() => {
    const c = independentCandidates.find(c => c.element.id === 'document-one');
    const raw = independentSources.find(s => s.element === c.element);
    return { contentProof: !!c.contentEvidence, sameSource: c.action === raw.action && c.href === raw.href && c.target === raw.target };
  })).toEqual({ contentProof: false, sameSource: true });
});

test('new generic proof preserves safe heading text while skipping private editor descendant getters', async ({ page }) => {
  await setup(page, genericDocuments('<span id="private-heading-branch" role="textbox"><i>PRIVATE_HEADING_VALUE</i></span>'), genericURL);
  await page.evaluate(() => {
    window.privateReads = 0;
    for (const node of document.querySelectorAll('#private-heading-branch,#private-heading-branch *'))
      for (const key of ['value', 'checked', 'textContent', 'innerText', 'children', 'childNodes']) Object.defineProperty(node, key, { get() { privateReads++; throw Error('private heading branch read'); } });
  });
  expect((await inspect(page)).find(c => c.id === 'document-one')).toMatchObject({ category: 'academic', content: 2 });
  expect(await page.evaluate(() => {
    const candidate = independentCandidates.find(c => c.element.id === 'document-one');
    return { reads: privateReads, leaked: JSON.stringify([candidate.snapshot, candidate.contentEvidence?.fingerprint]).includes('PRIVATE_'),
      editorRetained: candidate.contentEvidence?.dependencies.some(node => node.id === 'private-heading-branch') };
  })).toEqual({ reads: 0, leaked: false, editorRetained: false });
});

test('readonly metadata retains the collected source action and never runs an original handler', async ({ page }) => {
  await setup(page, panelPage({ extra: 'target="unfamiliar-panel" onclick="return false"' }));
  const rows = await inspect(page);
  expect(rows.find(c => c.id === 'deadline')).toMatchObject({ category: 'help', action: 'locate', task: 'reading', readonlyPanel: true });
  expect(await page.evaluate(() => independentCandidates.every(c => {
    const raw = independentSources.find(source => source.element === c.element);
    return c.action === raw.action && c.href === raw.href && c.target === raw.target && c.snapshot === raw.snapshot;
  }))).toBe(true);
  expect(await page.evaluate(() => {
    window.activationCount = 0;
    document.querySelector('#deadline').addEventListener('click', () => activationCount++);
    const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
    IndependentReading.openEasyMode(host);
    const card = [...host.shadowRoot.querySelectorAll('.card')].find(c => c.querySelector('.card-source')?.textContent.includes('공용 보험료 납부기간'));
    card.click();
    return { activationCount, sourceFocus: document.activeElement.id, hostExists: host.isConnected };
  })).toEqual({ activationCount: 0, sourceFocus: 'deadline', hostExists: false });
});

test('dangerous paths, duplicate command values and named flags are never waived for source locate links', async ({ page }) => {
  for (const href of ['/commands/%64elete', '/explanation?CMD=view&CMD=payment', '/explanation?Action=submit', '/explanation?Payment=0', '/explanation?mode=final_submit']) {
    await setup(page, panelPage({ href, extra: 'onclick="return false"' }));
    expect((await inspect(page)).some(c => c.id === 'deadline'), href).toBe(false);
  }
  for (const extra of ['onclick="completePayment()"', 'onclick="removeRecord()"', 'onclick="submitFinal()"']) {
    await setup(page, panelPage({ extra }));
    expect((await inspect(page)).some(c => c.id === 'deadline'), extra).toBe(false);
  }
});

test('ambiguous fragment targets or mismatched explanatory headings cannot justify a payment deadline', async ({ page }) => {
  for (const mutation of ['duplicate-id', 'mismatched-title', 'external-document', 'submit-control', 'interactive-panel']) {
    await setup(page, panelPage());
    await page.evaluate(mutation => {
      if (mutation === 'duplicate-id') document.body.append(document.querySelector('#explanation-one').cloneNode(true));
      if (mutation === 'mismatched-title') document.querySelector('#explanation-title').textContent = '별도 기준 안내';
      if (mutation === 'external-document') document.querySelector('#deadline').href = '/unrelated-page#explanation-one';
      if (mutation === 'submit-control') document.querySelector('#explanation-one').insertAdjacentHTML('beforeend', '<form><button>최종 제출</button></form>');
      if (mutation === 'interactive-panel') document.querySelector('#explanation-one').tabIndex = 0;
    }, mutation);
    expect((await inspect(page)).some(c => c.id === 'deadline'), mutation).toBe(false);
  }
});

test('private value, checked and custom editor properties are not read by classification or new fingerprints', async ({ page }) => {
  const values = `<input id="private-input" value="PRIVATE_INPUT"><input id="private-check" type="checkbox" checked><textarea>PRIVATE_TEXTAREA</textarea><div role="spinbutton">PRIVATE_SPIN</div><div role="combobox">PRIVATE_COMBO</div><div role="slider">PRIVATE_SLIDER</div><span role="textbox">PRIVATE_EDITOR</span>`;
  await setup(page, panelPage({ body: values }));
  await page.evaluate(() => {
    window.privateReads = 0;
    for (const node of document.querySelectorAll('input,textarea,[role="textbox"],[role="spinbutton"],[role="slider"],[role="combobox"]'))
      for (const key of ['value', 'checked', 'textContent', 'innerText']) Object.defineProperty(node, key, { get() { privateReads++; throw Error('private property accessed'); } });
  });
  const rows = await inspect(page);
  expect(rows.some(c => c.id === 'deadline')).toBe(false);
  expect(JSON.stringify(rows)).not.toContain('PRIVATE_');
  expect(await page.evaluate(() => ({ reads: privateReads, leaked: JSON.stringify(independentCandidates.map(c => [c.snapshot, c.institutionEvidence?.fingerprint, c.contentEvidence?.fingerprint])).includes('PRIVATE_') }))).toEqual({ reads: 0, leaked: false });
});

const attachmentPage = ({ href = '#local-bundle', extra = 'onclick="return false"', title = '관측장치 임시 사용신청서' } = {}) => `<main><section><h2>공개 작성 자료</h2><form id="document-form" method="post"><table><caption>공공 사용 신청서 및 서식 자료</caption><thead><tr><th>제목</th><th>첨부파일</th></tr></thead><tbody><tr id="document-row"><td><button id="record-title"><strong id="record-name">${title}</strong></button></td><td><a id="attachment" href="${href}" ${extra}>ZIP 파일다운로드</a></td></tr></tbody></table></form></section></main>`;

test('new preparation evidence belongs to an attachment anchor, while default submit is not newly promoted', async ({ page }) => {
  await setup(page, attachmentPage(), genericURL);
  const rows = await inspect(page);
  expect(rows.find(c => c.id === 'attachment')).toMatchObject({ action: 'locate', category: 'apply', task: 'reading', content: 2 });
  expect(rows.find(c => c.id === 'attachment').href).toBeUndefined();
  expect(await page.evaluate(() => {
    const subject = document.querySelector('#record-title'), source = independentSources.find(c => c.element === subject);
    const classified = independentCandidates.find(c => c.element === subject);
    return { type: subject.type, ownPreparation: !!IndependentReading.supplementalEvidence(subject).preparationAttachment,
      promotedReading: classified?.pageTask === 'reading', content: classified?.contentEvidence?.level,
      actionRetained: !classified || classified.action === source.action && classified.href === source.href };
  })).toEqual({ type: 'submit', ownPreparation: false, promotedReading: false, content: undefined, actionRetained: true });
});

test('dangerous attachment destinations or scripts cannot get a recommended reading card', async ({ page }) => {
  for (const options of [{ href: '/delete.zip' }, { href: '/bundle.zip?cmd=view&CMD=payment' }, { extra: 'onclick="finalSubmit()"' }, { title: '결제 요청신청서' }]) {
    await setup(page, attachmentPage(options), genericURL);
    expect((await inspect(page)).some(c => c.id === 'attachment'), JSON.stringify(options)).toBe(false);
  }
});

test('a same-frame attachment title replacement blocks the card before original focus or form activation', async ({ page }) => {
  await setup(page, attachmentPage(), genericURL);
  expect((await inspect(page)).find(c => c.id === 'attachment')).toBeTruthy();
  expect(await page.evaluate(() => {
    window.originalEvents = 0;
    document.querySelector('form').addEventListener('submit', e => { originalEvents++; e.preventDefault(); });
    document.querySelector('#attachment').addEventListener('click', e => { originalEvents++; e.preventDefault(); });
    const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
    IndependentReading.openEasyMode(host);
    const title = document.querySelector('#record-name'); title.replaceWith(title.cloneNode(true));
    const card = [...host.shadowRoot.querySelectorAll('.card')].find(c => c.querySelector('.card-source')?.textContent.includes('ZIP 파일다운로드'));
    card.click();
    return { originalEvents, sourceFocused: document.activeElement.id === 'attachment', hostExists: host.isConnected, notice: host.shadowRoot.querySelector('.change-notice')?.hidden === false };
  })).toEqual({ originalEvents: 0, sourceFocused: false, hostExists: true, notice: true });
});

test('an original focus handler changing the proof after the overlay closes gets the changed-source notice', async ({ page }) => {
  await setup(page, attachmentPage(), genericURL);
  expect((await inspect(page)).find(c => c.id === 'attachment')).toBeTruthy();
  expect(await page.evaluate(() => {
    window.originalEvents = 0;
    document.querySelector('#attachment').addEventListener('click', () => originalEvents++);
    document.querySelector('#attachment').addEventListener('focus', () => {
      const title = document.querySelector('#record-name'); title.replaceWith(title.cloneNode(true));
    });
    const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
    IndependentReading.openEasyMode(host);
    const card = [...host.shadowRoot.querySelectorAll('.card')].find(c => c.querySelector('.card-source')?.textContent.includes('ZIP 파일다운로드'));
    card.click();
    const notice = document.querySelector('[data-easyweb-notice]');
    return { originalEvents, hostExists: host.isConnected, reason: notice?.dataset.easywebNoticeReason,
      notice: notice?.shadowRoot?.querySelector('#easyweb-original-message')?.textContent ?? '' };
  })).toMatchObject({ originalEvents: 0, hostExists: false, reason: 'changed', notice: expect.stringMatching(/바뀌|변경/) });
});

test('source kind and relevance scoring cannot revive unclassified controls', async ({ page }) => {
  await setup(page, '<main><h2>공개 문서</h2><ul><li class="active"><a href="/course/overview.html">공용 자료</a></li><li><a id="arbitrary" href="/facts-one">문서 묶음</a></li><li><a id="dangerous" href="/delete">장비 설명서</a></li></ul></main>', genericURL);
  const rows = await inspect(page);
  expect(rows.some(c => c.id === 'arbitrary' || c.id === 'dangerous')).toBe(false);
  expect(await page.evaluate(() => {
    const raw = independentSources.find(c => c.element.id === 'arbitrary');
    raw.contentEvidence = { level: 2, rule: 'untrusted-metadata', dependencies: [raw.element], fingerprint: 'synthetic' };
    return [...IndependentReading.rank([...independentCandidates, raw]), ...IndependentReading.remainingMenus([raw], [])].some(c => c.element.id === 'arbitrary');
  })).toBe(false);
});
