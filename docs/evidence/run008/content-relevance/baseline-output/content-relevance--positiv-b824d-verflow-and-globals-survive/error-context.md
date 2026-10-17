# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: content-relevance.spec.mjs >> @positive six equally supported local topics remain author ordered while overflow and globals survive
- Location: tests/content-relevance.spec.mjs:143:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 6
+ Received  + 6

  Object {
    "all": Array [
      "local-0",
      "local-1",
      "local-2",
+     "global-search",
+     "global-apply",
+     "global-login",
      "local-3",
      "local-4",
      "local-5",
      "local-6",
      "local-7",
-     "global-apply",
-     "global-login",
-     "global-search",
    ],
    "first": Array [
      "local-0",
      "local-1",
      "local-2",
-     "local-3",
-     "local-4",
-     "local-5",
+     "global-search",
+     "global-apply",
+     "global-login",
    ],
  }
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - link "검색" [ref=e3] [cursor=pointer]:
      - /url: /search
    - link "신청" [ref=e4] [cursor=pointer]:
      - /url: /apply
    - link "로그인" [ref=e5] [cursor=pointer]:
      - /url: /login
  - main [ref=e6]:
    - heading "학사안내" [level=2] [ref=e7]
    - list [ref=e8]:
      - listitem [ref=e9]:
        - link "융합학위 운영편람" [ref=e10] [cursor=pointer]:
          - /url: /education/book-0.html
      - listitem [ref=e11]:
        - link "독립전공 안내책자" [ref=e12] [cursor=pointer]:
          - /url: /education/book-1.html
      - listitem [ref=e13]:
        - link "공동학위 설명서" [ref=e14] [cursor=pointer]:
          - /url: /education/book-2.html
      - listitem [ref=e15]:
        - link "복수전공 핸드북" [ref=e16] [cursor=pointer]:
          - /url: /education/book-3.html
      - listitem [ref=e17]:
        - link "연계학위 자료집" [ref=e18] [cursor=pointer]:
          - /url: /education/book-4.html
      - listitem [ref=e19]:
        - link "창의전공 요람" [ref=e20] [cursor=pointer]:
          - /url: /education/book-5.html
      - listitem [ref=e21]:
        - link "미래학위 지침서" [ref=e22] [cursor=pointer]:
          - /url: /education/book-6.html
      - listitem [ref=e23]:
        - link "교양학위 매뉴얼" [ref=e24] [cursor=pointer]:
          - /url: /education/book-7.html
```

# Test source

```ts
  55  | 
  56  | test('array shuffles and unfamiliar labels retain source-backed selection and distinct overflow', async ({ page }) => {
  57  |   await setup(page, primary().replace('미래융합 학위 운영편람', '독립학위 handbook').replace('새로운 전공 선택 안내책자', '연계전공 manual'));
  58  |   expect(await page.evaluate(() => {
  59  |     const expected = ContentRelevance.rank(candidates).map(candidate => candidate.element.id).join(',');
  60  |     for (let run = 0; run < 24; run++) {
  61  |       const rotated = [...candidates.slice(run % candidates.length), ...candidates.slice(0, run % candidates.length)].reverse();
  62  |       if (ContentRelevance.rank(rotated).map(candidate => candidate.element.id).join(',') !== expected) return false;
  63  |     }
  64  |     const first = ContentRelevance.rank(candidates);
  65  |     const all = [...first, ...ContentRelevance.remainingMenus([...candidates, candidates[0]], first)];
  66  |     return all.length === candidates.length && new Set(all.map(candidate => candidate.element)).size === candidates.length
  67  |       && all.every(candidate => candidates.includes(candidate));
  68  |   })).toBe(true);
  69  | });
  70  | 
  71  | for (const [name, html] of [
  72  |   ['plain body sidebar', `<div><h2>학사안내</h2>${documents}</div>`],
  73  |   ['unrelated main heading', `<main><h2>별도 지역 안내</h2>${documents}</main>`],
  74  |   ['neighbouring heading', `<section><h2>학사안내</h2></section><main>${documents}</main>`],
  75  |   ['article', `<main><article><h2>학사안내</h2>${documents}</article></main>`],
  76  |   ['navigation', `<main><nav><h2>학사안내</h2>${documents}</nav></main>`],
  77  |   ['form', `<main><form><h2>학사안내</h2>${documents}</form></main>`],
  78  |   ['breadcrumb', `<main class="breadcrumb"><h2>학사안내</h2>${documents}</main>`],
  79  |   ['skip navigation', `<main id="skip-navigation"><h2>학사안내</h2>${documents}</main>`],
  80  | ]) test(`unproven ${name} cannot acquire content relevance`, async ({ page }) => {
  81  |   await setup(page, html);
  82  |   expect(await page.evaluate(() => candidates.some(candidate => candidate.contentEvidence))).toBe(false);
  83  | });
  84  | 
  85  | test('a heading or current selected row replacement changes dependency identity', async ({ page }) => {
  86  |   for (const id of ['current-heading', 'documents']) {
  87  |     await setup(page, primary());
  88  |     expect(await page.evaluate(id => {
  89  |       const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  90  |       const oldProof = candidate.contentEvidence;
  91  |       const node = document.getElementById(id);
  92  |       const replacement = node.cloneNode(false);
  93  |       while (node.firstChild) replacement.append(node.firstChild);
  94  |       node.replaceWith(replacement);
  95  |       const proof = ContentRelevance.contentEvidence(candidate);
  96  |       return !!proof && oldProof.dependencies.includes(node) && !proof.dependencies.includes(node)
  97  |         && proof.dependencies.includes(replacement);
  98  |     }, id)).toBe(true);
  99  |   }
  100 | });
  101 | 
  102 | test('changing selection, topic heading, or dependency danger removes the positive relation', async ({ page }) => {
  103 |   for (const kind of ['selected', 'heading', 'danger']) {
  104 |     await setup(page, primary());
  105 |     expect(await page.evaluate(kind => {
  106 |       const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  107 |       if (kind === 'selected') document.querySelector('#current-topic').parentElement.className = '';
  108 |       if (kind === 'heading') document.getElementById('current-heading').replaceChildren('다른 지역 자료');
  109 |       if (kind === 'danger') document.getElementById('document-b').setAttribute('href', '/delete?cmd=payment');
  110 |       return ContentRelevance.contentEvidence(candidate);
  111 |     }, kind)).toBeUndefined();
  112 |   }
  113 | });
  114 | 
  115 | test('nested editable values and private getters are excluded from all proof fingerprints', async ({ page }) => {
  116 |   await setup(page, primary().replace('id="current-heading">학사안내', 'id="current-heading">학사안내<span role="textbox">PRIVATE_EDITOR</span><textarea>PRIVATE_TEXTAREA</textarea>'));
  117 |   expect(await page.evaluate(() => {
  118 |     let reads = 0;
  119 |     for (const node of document.querySelectorAll('textarea,[role="textbox"]')) for (const key of ['value','textContent','innerText'])
  120 |       Object.defineProperty(node, key, { get() { reads++; throw Error('private getter'); } });
  121 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  122 |     const proof = ContentRelevance.contentEvidence(candidate);
  123 |     return { reads, hasProof: !!proof, privateInFingerprint: proof?.fingerprint.includes('PRIVATE_') };
  124 |   })).toEqual({ reads: 0, hasProof: true, privateInFingerprint: false });
  125 | });
  126 | 
  127 | test('dangerous original controls, branch expanders, default submits and below-threshold candidates get no evidence', async ({ page }) => {
  128 |   await setup(page, primary().replace('href="/education/other-book.html#unfamiliar"', 'href="/delete?cmd=payment"'));
  129 |   expect(await page.evaluate(() => candidates.some(candidate => candidate.element.id === 'document-a'))).toBe(false);
  130 |   await setup(page, primary());
  131 |   expect(await page.evaluate(() => {
  132 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  133 |     const below = ContentRelevance.contentEvidence({ ...candidate, score: 54 });
  134 |     candidate.element.setAttribute('aria-expanded','false');
  135 |     const branch = ContentRelevance.contentEvidence(candidate);
  136 |     const form = document.createElement('form'); const button = document.createElement('button');
  137 |     button.textContent = '새로운 학위 안내서'; form.append(button); document.querySelector('main').append(form);
  138 |     const submit = ContentRelevance.contentEvidence({ ...candidate, element: button, label: '새로운 학위 안내서', action: 'locate' });
  139 |     return [below, branch, submit].every(proof => proof === undefined);
  140 |   })).toBe(true);
  141 | });
  142 | 
  143 | test('@positive six equally supported local topics remain author ordered while overflow and globals survive', async ({ page }) => {
  144 |   const labels = ['융합학위 운영편람','독립전공 안내책자','공동학위 설명서','복수전공 핸드북','연계학위 자료집','창의전공 요람','미래학위 지침서','교양학위 매뉴얼'];
  145 |   await setup(page, `${globals}<main><h2 id="topic-heading">학사안내</h2><ul>${labels.map((label,index) => `<li><a id="local-${index}" href="/education/book-${index}.html">${label}</a></li>`).join('')}</ul></main>`);
  146 |   expect(await page.evaluate(() => {
  147 |     const dependencies = [document.querySelector('main'), document.getElementById('topic-heading')];
  148 |     for (const candidate of candidates.filter(candidate => candidate.element.id.startsWith('local-'))) {
  149 |       candidate.institutionEvidence = { version: 37, rule: 'synthetic-explicit-topic', contentScope: 'content', dependencies, fingerprint: 'fixed-synthetic-topic' };
  150 |       candidate.contentEvidence = ContentRelevance.contentEvidence(candidate);
  151 |     }
  152 |     const first = ContentRelevance.rank(candidates);
  153 |     const rest = [...ContentRelevance.remainingMenus(candidates, first)];
  154 |     return { first: first.map(candidate => candidate.element.id), all: [...first,...rest].map(candidate => candidate.element.id) };
> 155 |   })).toEqual({ first: Array.from({ length: 6 }, (_,index) => `local-${index}`),
      |       ^ Error: expect(received).toEqual(expected) // deep equality
  156 |     all: [...Array.from({ length: 8 }, (_,index) => `local-${index}`), 'global-apply','global-login','global-search'] });
  157 | });
  158 | 
  159 | test('reading tie groups cannot borrow a higher relevance position', async ({ page }) => {
  160 |   await setup(page, `<main><h2>학사안내</h2><ul><li><a id="ordinary-long" href="/education/book.html">융합학위 운영편람</a></li><li><a id="proven-short" href="/education/topic-two.html">전공제도</a></li></ul></main>`);
  161 |   expect(await page.evaluate(() => {
  162 |     const preferred = candidates.find(candidate => candidate.element.id === 'proven-short');
  163 |     preferred.contentEvidence = { level: 1, rule: 'synthetic', dependencies: [preferred.element], fingerprint: 'synthetic' };
  164 |     return ContentRelevance.rank(candidates).map(candidate => candidate.element.id);
  165 |   })).toEqual(['proven-short','ordinary-long']);
  166 | });
  167 | 
```