import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// Synthetic controls only: no fixture or holdout imports. Calibration misses
// motivate generic policy regressions; compile without a global build.
let engine;
test.beforeAll(async () => {
  const sourceRoot = process.env.EASYWEB_ENGINE_ROOT ?? './src';
  const result = await build({
    stdin: {
      contents: `export { analyzePage } from ${JSON.stringify(`${sourceRoot}/analyzer.ts`)}; export { classify } from ${JSON.stringify(`${sourceRoot}/classifier.ts`)}; export { rank } from ${JSON.stringify(`${sourceRoot}/ranker.ts`)};`,
      resolveDir: process.cwd(),
      sourcefile: 'synthetic-ranking-entry.ts',
    },
    bundle: true, write: false, format: 'iife', globalName: 'SyntheticEngine',
  });
  engine = result.outputFiles[0].text;
});

async function inspect(page, specs, markup = '<main></main>') {
  await page.setContent(markup);
  await page.addScriptTag({ content: engine });
  return page.evaluate(specs => {
    const candidates = specs.map((spec, index) => {
      const element = spec.selector ? document.querySelector(spec.selector) : document.createElement('a');
      if (!element.isConnected) document.body.append(element);
      if (!element.id) element.id = `synthetic-${index}`;
      if (spec.forbidValueRead) Object.defineProperty(element, 'value', { get() { throw new Error('입력값 접근 금지'); } });
      return {
        element, label: spec.label, href: spec.href, snapshot: spec.snapshot,
        target: spec.target, destinationHost: spec.destinationHost, opensNewWindow: spec.opensNewWindow,
        context: spec.context ?? 'primary', action: spec.action ?? (spec.href ? 'navigate' : 'locate'),
        score: spec.score ?? 0, category: spec.category, sectionLabel: spec.sectionLabel,
        contextLabels: spec.contextLabels, pagePurpose: spec.pagePurpose, pageTask: spec.pageTask, reasons: [],
      };
    });
    const summarize = list => list.map(({ element, ...candidate }) => ({ ...candidate, id: element.id }));
    const classified = window.SyntheticEngine.classify(candidates);
    return {
      classified: summarize(classified),
      ranked: summarize(window.SyntheticEngine.rank(classified)),
      directRanked: summarize(window.SyntheticEngine.rank(candidates)),
    };
  }, specs);
}

test('강한 메뉴 URL은 단독 근거가 되며 문구 근거를 우선한다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '바로가기', href: 'https://example.test/auth/login.do' },
    { label: 'Open', href: 'https://example.test/service/search/index.html' },
    { label: 'Academic', href: 'https://example.test/search' },
    { label: '자료 찾기', selector: '#searchbox', action: 'locate', context: 'body' },
  ], '<div id="searchbox" role="searchbox textbox" aria-label="자료 찾기"></div>');
  expect(classified.map(item => item.category)).toEqual(['login', 'search', 'academic', 'search']);
  expect(classified[2].score).toBeGreaterThan(classified[1].score);
  expect(classified[0].reasons.join(' ')).toContain('URL');
  expect(classified[3].reasons.join(' ')).toContain('검색 제어');
});

test('더보기는 짧고 명확한 주변 기능 제목으로만 보완하며 기사·하단·모순은 제외한다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '더보기', sectionLabel: '공지사항', href: 'https://example.test/board/list', context: 'body' },
    { label: 'Read more', sectionLabel: 'FAQ', href: 'https://example.test/support/list', context: 'body' },
    { label: '자세히 보기', sectionLabel: '수강신청', href: 'https://example.test/academic/index', context: 'body' },
    { label: '★ 캠퍼스 소식 더보기', sectionLabel: '공지사항', href: 'https://example.test/notice.do', context: 'body' },
    { label: '★ 캠퍼스 소식 더보기', sectionLabel: '공지사항', href: 'https://example.test/updates/list', context: 'body' },
    { label: '더보기', sectionLabel: '검색 서비스가 달라집니다', href: 'https://example.test/updates/42', context: 'body' },
    { label: '관련 기사', sectionLabel: '공지사항', href: 'https://example.test/updates/42', context: 'body' },
    { label: '더보기', sectionLabel: '공지사항', href: 'https://example.test/articles/42', context: 'body' },
    { label: '더보기', sectionLabel: '공지사항', href: 'https://example.test/board/list', context: 'footer' },
    { label: '더보기', sectionLabel: '공지사항', href: 'https://example.test/search', context: 'body' },
  ]);
  expect(classified.map(item => item.category)).toEqual(['notice', 'help', 'academic', 'notice']);
  expect(classified[0].reasons.join(' ')).toContain('주변');
  expect(classified[2].score).toBeGreaterThan(classified[0].score);
});

test('모호한 문구·부분 문자열·기사 URL을 기능으로 부풀리지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: 'Research', href: 'https://example.test/research' },
    { label: '도움', href: 'https://example.test/helpful-story' },
    { label: 'More', href: 'https://example.test/login-news' },
    { label: '자세히 보기', href: 'https://example.test/login', context: 'body' },
    { label: '검색 서비스 개편 안내', href: 'https://example.test/news/2026/service-launch', context: 'body' },
    { label: 'Search tools announced', href: 'https://example.test/articles/search-guide', context: 'primary' },
    { label: 'More', href: 'https://example.test/articles/login', context: 'primary' },
    { label: '검색', href: 'https://example.test/news/search', context: 'primary' },
    { label: '신청 방법이 달라집니다', href: 'https://example.test/updates/42', context: 'body', selector: '#story' },
  ], '<article><a id="story">신청 방법이 달라집니다</a></article>');
  expect(classified).toEqual([]);
});

test('한국어·영어·유니코드 정규화와 범용 의미를 지원한다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: 'Sign in', href: 'https://example.test/account' },
    { label: 'ＳＥＡＲＣＨ', href: 'https://example.test/tools' },
    { label: '공지사항', href: 'https://example.test/board/list' },
    { label: 'Student portal', href: 'https://example.test/campus' },
    { label: '자주 묻는 질문', href: 'https://example.test/support' },
    { label: 'Reservation', href: 'https://example.test/booking' },
  ]);
  expect(classified.map(item => item.category)).toEqual(['login', 'search', 'notice', 'academic', 'help', 'apply']);
});

test('FAQ·검색 사용법·도움말 다운로드·민원실 안내와 새소식을 구별한다', async ({ page }) => {
  const labels = ['자주하는질문', '자주 하는 질문', '검색방법', '통합검색 방법 안내', '뷰어다운로드', 'Viewer download', '민원실안내', '상담 안내', '새소식'];
  const { classified } = await inspect(page, labels.map((label, index) => ({ label, href: `https://example.test/utility/${index}` })));
  expect(classified.map(item => item.category)).toEqual(['help', 'help', 'help', 'help', 'help', 'help', 'help', 'help', 'notice']);
  const rejected = await inspect(page, [
    { label: '자주 하는 운동', href: 'https://example.test/utility/exercise' },
    { label: '검색방법 개선 발표', href: 'https://example.test/articles/42' },
    { label: '새소식 출시 안내', href: 'https://example.test/news/2026/launch' },
  ]);
  expect(rejected.classified).toEqual([]);
});

test('소식알림·상담 운영은 일반적인 공지·도움 기능이며 모집 기사는 승격하지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '소식알림', href: 'https://example.test/updates' },
    { label: '소식 알림', href: 'https://example.test/updates/list' },
    { label: '상담 운영', href: 'https://example.test/support/hours', context: 'body' },
    { label: '무료상담운영', href: 'https://example.test/support/advice', context: 'body' },
    { label: '상담사 모집공고', href: 'https://example.test/careers/42', context: 'body' },
    { label: '상담 운영 개선 발표', href: 'https://example.test/articles/42', context: 'body' },
  ]);
  expect(classified.map(item => item.category)).toEqual(['notice', 'notice', 'help', 'help']);
});

test('공고·고시 목록과 뷰어 설치 제어는 찾되 글 제목의 공고만으로 기능을 만들지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '공고/고시 바로가기', href: 'https://example.test/public/list', context: 'primary' },
    { label: '고시 · 공고', href: 'https://example.test/public/list?kind=all', context: 'body' },
    { label: '공고 목록', href: 'https://example.test/public/list?kind=notice', context: 'body' },
    { label: '통합뷰어 설치 다운로드', href: 'https://example.test/files/reader', context: 'body' },
    { label: '문서뷰어설치다운로드', action: 'locate', context: 'body' },
    { label: '상담사 모집공고', href: 'https://example.test/careers/42', context: 'body' },
    { label: '국가고시 학습법', href: 'https://example.test/study/42', context: 'body' },
  ]);
  expect(classified.map(item => item.category)).toEqual(['notice', 'notice', 'notice', 'help', 'help']);
});

test('전자책 읽기는 FAQ 목적지 근거가 있어야 도움말이며 임의 도서는 승격하지 않는다', async ({ page }) => {
  const source = { label: '전자책 보기', href: 'https://example.test/Ebook/2032_FAQ/index.html', context: 'body', action: 'locate',
    target: '_blank', destinationHost: 'example.test', opensNewWindow: true,
    snapshot: { pageUrl: 'https://source.test/questions', baseUrl: 'https://source.test/', attributes: '["original"]' } };
  const { classified } = await inspect(page, [
    source,
    { label: 'E-book open', href: 'https://example.test/faq/guide-book.html', context: 'body' },
    { label: '전자책 보기', href: 'https://example.test/fiction/index.html', context: 'body' },
    { label: '전자책 보기', href: 'https://example.test/FAQish/index.html', context: 'body' },
    { label: '전자책 보기', action: 'locate', context: 'body' },
  ]);
  expect(classified.map(item => item.category)).toEqual(['help', 'help']);
  expect(classified.every(item => item.reasons.join(' ').includes('문서 읽기'))).toBe(true);
  expect(classified[0]).toMatchObject(source);
});

test('명확한 상위 Q&A 문맥과 홈페이지 바로가기 동작을 함께 요구한다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '공공 상담 홈페이지 바로가기', contextLabels: ['상담 창구', 'Q&A'], action: 'locate', context: 'body' },
    { label: '홈페이지 바로가기', contextLabels: ['외부 기관', 'User guide'], href: 'https://example.test/public-service', context: 'body' },
    { label: '공공 상담 홈페이지 바로가기', contextLabels: ['상담 창구'], action: 'locate', context: 'body' },
    { label: '홈페이지 바로가기', contextLabels: ['Q&A가 개선되었습니다'], action: 'locate', context: 'body' },
    { label: '홈페이지 바로가기', contextLabels: ['Q&A'], action: 'locate', context: 'footer' },
    { label: '홈페이지 바로가기', contextLabels: ['Q&A'], selector: '#article-handoff', href: 'https://example.test/services/42', context: 'body' },
  ], '<article><a id="article-handoff">홈페이지 바로가기</a></article>');
  expect(classified.map(item => item.category)).toEqual(['help', 'help']);
  expect(classified.every(item => item.reasons.join(' ').includes('상위 도움말'))).toBe(true);
});

test('FAQ 페이지의 명시적 질문 표시는 읽기 기능이고 기사·일반 문답 표기는 기능이 아니다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: 'Q 제도의 가입 대상과 안내 절차는 어떻게 되나요?', selector: '#question', pagePurpose: 'help', action: 'locate', context: 'body' },
    { label: 'Q Where can I find the service guide?', selector: '#english-question', contextLabels: ['FAQ'], action: 'locate', context: 'body' },
    { label: 'Q 제도의 가입 대상은 어떻게 되나요?', selector: '#unscoped', action: 'locate', context: 'body' },
    { label: '질문의 답을 찾아보기', selector: '#unmarked', pagePurpose: 'help', action: 'locate', context: 'body' },
    { label: 'Q 연구 인터뷰 문답', selector: '#article-question', pagePurpose: 'help', href: 'https://example.test/interview/42', context: 'body' },
  ], '<ul><li><a id="question" href="#q"><abbr title="질문">Q</abbr>제도의 가입 대상과 안내 절차는 어떻게 되나요?</a></li><li><a id="english-question" href="#q2"><abbr title="Question">Q</abbr>Where can I find the service guide?</a></li></ul><ul><li><a id="unscoped"><abbr title="질문">Q</abbr>제도의 가입 대상은 어떻게 되나요?</a></li><li><a id="unmarked">질문의 답을 찾아보기</a></li></ul><article><ul><li><a id="article-question" href="/interview/42"><abbr title="질문">Q</abbr>연구 인터뷰 문답</a></li></ul></article>');
  expect(classified.map(item => [item.id, item.category, item.action])).toEqual([['question', 'help', 'locate'], ['english-question', 'help', 'locate']]);
  expect(classified.every(item => item.reasons.join(' ').includes('질문 읽기'))).toBe(true);
});

test('별개 항목의 안전하고 보이는 질문 표시 두 개는 FAQ 문맥이며 숨김·유사표시·편집·기사·단일항목은 아니다', async ({ page }) => {
  const ids = ['one', 'two', 'hidden-only', 'lookalike-only', 'private-only', 'same-item', 'article-q'];
  const { classified } = await inspect(page, ids.map(id => ({ label: 'Q 가입은 언제 가능한가요?', selector: `#${id}`, action: 'locate', context: 'body' })), `
    <ul><li><a id="one"><abbr title="질문">Q</abbr>가입은 언제 가능한가요?</a></li><li><button id="two"><abbr title="Question">Q</abbr>다른 절차는 어떻게 되나요?</button></li></ul>
    <ul><li><a id="hidden-only"><abbr title="질문">Q</abbr>가입은 언제 가능한가요?</a></li><li hidden><a><abbr title="질문">Q</abbr>숨긴 항목</a></li></ul>
    <ul><li><a id="lookalike-only"><abbr title="질문">Q</abbr>가입은 언제 가능한가요?</a></li><li><a><abbr title="Questionnaire">Q</abbr>설문 문항</a></li></ul>
    <ul><li><a id="private-only"><abbr title="질문">Q</abbr>가입은 언제 가능한가요?</a></li><li contenteditable="true"><a><abbr title="질문">Q</abbr>PRIVATE_TYPED_TEXT</a></li></ul>
    <ul><li><a id="same-item"><abbr title="질문">Q</abbr>가입은 언제 가능한가요?</a><button><abbr title="질문">Q</abbr>같은 항목의 보조 제어</button></li></ul>
    <article><ul><li><a id="article-q"><abbr title="질문">Q</abbr>가입은 언제 가능한가요?</a></li><li><a><abbr title="질문">Q</abbr>다른 절차는 어떻게 되나요?</a></li></ul></article>`);
  expect(classified.map(item => item.id)).toEqual(['one', 'two']);
  expect(classified.every(item => item.category === 'help' && item.pageTask === 'reading')).toBe(true);
});

test('학사일정 페이지 목적은 일정 보기 모드를 설명하지만 임의 보기·기사에는 전파하지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '달력으로 일정 보기', pagePurpose: 'academic-calendar', href: 'https://example.test/calendar?mode=calendar', context: 'body' },
    { label: '리스트로 일정 보기', pagePurpose: 'academic-calendar', href: 'https://example.test/calendar?mode=list', context: 'body' },
    { label: '달력으로 일정 보기', href: 'https://example.test/calendar?mode=calendar', context: 'body' },
    { label: '개인정보 보기', pagePurpose: 'academic-calendar', action: 'locate', context: 'body' },
    { label: '리스트로 일정 보기', pagePurpose: 'academic-calendar', selector: '#article-view', href: 'https://example.test/updates/42', context: 'body' },
  ], '<article><a id="article-view">리스트로 일정 보기</a></article>');
  expect(classified.map(item => item.category)).toEqual(['academic', 'academic']);
  expect(classified.every(item => item.reasons.join(' ').includes('일정 보기'))).toBe(true);
});

test('학사일정 표의 원본 행사만 읽기로 안내하고 일반 표·링크·위험 행사는 제외한다', async ({ page }) => {
  const { classified, ranked } = await inspect(page, [
    { label: '2032-1학기 기말고사', selector: '#exam', pagePurpose: 'academic-calendar', action: 'locate', context: 'body' },
    { label: '2032-1학기 종강', selector: '#end', pagePurpose: 'academic-calendar', action: 'locate', context: 'body' },
    { label: '2032-1학기 기말고사', selector: '#ordinary-table', action: 'locate', context: 'body' },
    { label: '2032-1학기 기말고사', selector: '#outside-grid', pagePurpose: 'academic-calendar', action: 'locate', context: 'body' },
    { label: '2032-1학기 최종 제출', selector: '#submit-event', pagePurpose: 'academic-calendar', action: 'locate', context: 'body' },
    { label: '학사 서비스 출시 기사', selector: '#linked-story', href: 'https://example.test/news/42', pagePurpose: 'academic-calendar', context: 'body' },
  ], '<table><tbody><tr><td><a id="exam">2032-1학기 기말고사</a></td><td><a id="end">2032-1학기 종강</a></td><td><a id="ordinary-table">2032-1학기 기말고사</a></td><td><a id="submit-event">2032-1학기 최종 제출</a></td><td><a id="linked-story" href="/news/42">학사 서비스 출시 기사</a></td></tr></tbody></table><a id="outside-grid">2032-1학기 기말고사</a>');
  expect(classified.map(item => item.id)).toEqual(['exam', 'end']);
  expect(classified.filter(item => item.reasons.join(' ').includes('일정 항목 읽기')).map(item => item.id)).toEqual(['exam', 'end']);
  expect(classified.some(item => item.id === 'submit-event' || item.id === 'linked-story')).toBe(false);
  expect(ranked.every(item => item.action === 'locate')).toBe(true);
});

test('새 문맥·읽기 정책의 부정 사례는 이전 엔진과 동일하게 후보를 만들지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '상담사 모집공고', href: 'https://example.test/careers/42', context: 'body' },
    { label: '통합뷰어 설치 다운로드', href: 'https://example.test/articles/42', context: 'body' },
    { label: '전자책 보기', href: 'https://example.test/FAQish/index.html', context: 'body' },
    { label: '전자책 보기', href: 'https://example.test/document?title=FAQ', context: 'body' },
    { label: '홈페이지 바로가기', contextLabels: ['Q&A 서비스 도입 소식'], action: 'locate', context: 'body' },
    { label: '홈페이지 바로가기', contextLabels: ['Q&A'], href: 'https://example.test/search', context: 'body' },
    { label: '홈페이지 바로가기', contextLabels: ['Q&A'], action: 'locate', context: 'footer' },
    { label: 'Q 제도에 관해 알려주세요', selector: '#wrong-marker', pagePurpose: 'help', action: 'locate', context: 'body' },
    { label: 'Q 제도에 관해 알려주세요', selector: '#wrong-endpoint', pagePurpose: 'help', href: 'https://example.test/search', context: 'body' },
    { label: 'Q 제도에 관해 알려주세요', selector: '#article-marker', pagePurpose: 'help', action: 'locate', context: 'body' },
    { label: '리스트로 일정 보기', href: 'https://example.test/calendar?mode=list', context: 'body' },
    { label: '2032-1학기 최종 제출', selector: '#unsafe-calendar', pagePurpose: 'academic-calendar', action: 'locate', context: 'body' },
  ], '<ul><li><a id="wrong-marker"><abbr title="Interview">Q</abbr>제도에 관해 알려주세요</a></li><li><a id="wrong-endpoint" href="/search"><abbr title="질문">Q</abbr>제도에 관해 알려주세요</a></li></ul><article><ul><li><a id="article-marker"><abbr title="질문">Q</abbr>제도에 관해 알려주세요</a></li></ul></article><table><tbody><tr><td><a id="unsafe-calendar">2032-1학기 최종 제출</a></td></tr></tbody></table>');
  expect(classified).toEqual([]);
});

test('정확한 하단 도움말 일반 링크는 낮은 순위로 남기고 모호한 문구·동작은 제외한다', async ({ page }) => {
  const { classified, ranked } = await inspect(page, [
    { label: 'Q&A', href: 'https://example.test/support/questions', context: 'footer' },
    { label: 'FAQ', href: 'https://example.test/support/answers', context: 'footer' },
    { label: 'Q&A', action: 'locate', context: 'footer' },
    { label: '바로가기', href: 'https://example.test/support', context: 'footer' },
    { label: 'FAQ 서비스 도입 안내', href: 'https://example.test/support/launch', context: 'footer' },
    { label: '검색', href: 'https://example.test/search', context: 'primary' },
  ]);
  expect(classified.map(item => item.label)).toEqual(['Q&A', 'FAQ', '검색']);
  expect(ranked[0].category).toBe('search');
  expect(ranked.slice(1).every(item => item.category === 'help')).toBe(true);
});

test('안전한 FAQ 제목은 바로가기 원본 제어를 설명하지만 일반 설명문은 기능을 만들지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '바로가기', sectionLabel: '자주찾는 질문(FAQ)', action: 'locate', context: 'body' },
    { label: '바로가기', sectionLabel: '자주 묻는 질문 (FAQ)', href: 'https://example.test/support/answers', context: 'body' },
    { label: '바로가기', sectionLabel: 'FAQ가 어떻게 개선되었는지 안내합니다', action: 'locate', context: 'body' },
    { label: '바로가기', sectionLabel: '어떤 도움이 필요하세요?', action: 'locate', context: 'body' },
  ]);
  expect(classified.map(item => [item.category, item.action])).toEqual([['help', 'locate'], ['help', 'navigate']]);
});

test('문의는 실제 질문 목적만 인식하고 방문의 해·방문의날·영문의 해설은 제외한다', async ({ page }) => {
  const labels = ['문의', '문의하기', '문의처', '문의사항', '고객문의', '이용문의', '서비스 문의', '전화 문의하기'];
  const supported = await inspect(page, labels.map((label, index) => ({ label, href: `https://example.test/support/${index}` })));
  expect(supported.classified.map(item => item.category)).toEqual(labels.map(() => 'help'));
  const excluded = await inspect(page, ['2027 문화도시 방문의 해', '도시방문의 해', '도시 방문의날', '영문의 해설'].map((label, index) => ({ label, href: `https://example.test/culture/${index}` })));
  expect(excluded.classified).toEqual([]);
});

test('안전한 이름의 text·기본 입력 검색창은 submit보다 의미 근거가 높고 입력값을 읽지 않는다', async ({ page }) => {
  for (const type of ['type="text"', '']) {
    const { classified, ranked } = await inspect(page, [
      { label: '검색 열기', selector: '#header-search', context: 'primary', action: 'locate' },
      { label: '검색어 입력', selector: '#query', context: 'body', action: 'locate', forbidValueRead: true },
      { label: '검색', selector: '#submit', context: 'body', action: 'locate' },
    ], `<header><button id="header-search">검색 열기</button></header><form><input id="query" ${type} aria-label="검색어 입력"><button id="submit" type="submit">검색</button></form>`);
    expect(classified.find(item => item.id === 'query').score).toBeGreaterThan(classified.find(item => item.id === 'submit').score);
    // Current-page input comes before the global opener under the bounded
    // page-task policy; both remain available and submit stays below input.
    expect(ranked.map(item => item.id)).toEqual(['query', 'header-search', 'submit']);
  }
});

test('Q&A·뷰어프로그램 안내·기계식 검색 팁 이름을 도움말로 읽고 실제 입력 의미는 보존한다', async ({ page }) => {
  const labels = ['Q&A', 'Q & A', '뷰어프로그램 안내', 'search_tip', 'search-tip', 'Search tips'];
  const { classified } = await inspect(page, [
    ...labels.map((label, index) => ({ label, href: `https://example.test/utility/${index}` })),
    { label: 'Research_tip', href: 'https://example.test/utility/research' },
    { label: 'search_tip', selector: '#query', context: 'body', action: 'locate', forbidValueRead: true },
  ], '<input id="query" type="text" aria-label="search_tip">');
  expect(classified.map(item => item.category)).toEqual([...labels.map(() => 'help'), 'search']);
  expect(classified.at(-1).id).toBe('query');
  expect(classified[3].label).toBe('search_tip');
});

test('학사 분야와 신청 목적이 동점이면 명시적 신청을 우선하며 조회·도움말은 보존한다', async ({ page }) => {
  const labels = ['수강신청', '학적 신청', 'Academic application', '수강 안내', '등록금 조회', '예약 도움말'];
  const { classified } = await inspect(page, labels.map((label, index) => ({ label, href: `https://example.test/tasks/${index}` })));
  expect(classified.map(item => item.category)).toEqual(['apply', 'apply', 'apply', 'academic', 'academic', 'help']);
});

test('조회순·검색순 같은 정렬 기준을 업무 조회로 오인하지 않고 실제 조회는 보존한다', async ({ page }) => {
  const supported = ['조회', '내역 조회', '예약 조회', '내 신청 조회'];
  const sorting = ['조회순', '조회 수 순', '검색순', '신청순', '예약순', '등록순'];
  const { classified } = await inspect(page, [...supported, ...sorting].map((label, index) => ({ label, href: `https://example.test/controls/${index}`, context: 'body' })));
  expect(classified.map(item => item.label)).toEqual(supported);
  expect(classified.every(item => item.category === 'apply')).toBe(true);
});

test('연락처·조직 전화번호 기능은 도움말이며 단어가 섞인 설명문과 기사는 아니다', async ({ page }) => {
  const positive = ['조직 및 전화번호 안내', '담당부서연락처', '직원 전화번호 안내', 'Contact directory', 'Department contacts'];
  const negative = ['전화번호 유출 소식', '조직 전화번호 체계 연구', '담당부서 연락처 변경 발표'];
  const { classified } = await inspect(page, [
    ...[...positive, ...negative].map((label, index) => ({ label, href: `https://example.test/directory/${index}`, context: 'body' })),
    { label: '담당부서연락처', href: 'https://example.test/articles/42', context: 'body' },
  ]);
  expect(classified.map(item => item.label)).toEqual(positive);
  expect(classified.every(item => item.category === 'help')).toBe(true);
});

test('이용·운영·개관 시간 안내는 도움말이며 시간 주제의 발표·기사는 아니다', async ({ page }) => {
  const positive = ['이용시간', '운영 시간 안내', '개관시간', '업무시간 안내', 'Opening hours'];
  const { classified } = await inspect(page, [
    ...positive.map((label, index) => ({ label, href: `https://example.test/facilities/${index}`, context: 'body' })),
    { label: '이용시간 확대 발표', href: 'https://example.test/updates/42', context: 'body' },
    { label: '시간 활용 안내', href: 'https://example.test/reading/42', context: 'body' },
    { label: '운영시간 안내', href: 'https://example.test/news/42', context: 'body' },
  ]);
  expect(classified.map(item => item.label)).toEqual(positive);
  expect(classified.every(item => item.category === 'help')).toBe(true);
});

test('서식 목록·발급 절차의 명시적 문서만 신청 준비 읽기로 분류하며 일반 다운로드·기사는 아니다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '주소 변경신고서', selector: '#form-detail', href: 'https://example.test/material/detail?record=8', sectionLabel: '서식자료', context: 'body' },
    { label: '수령 위임장 다운받기', selector: '#form-download', action: 'locate', contextLabels: ['회원증 발급'], context: 'body' },
    { label: 'Download consent form', selector: '#english-form', action: 'locate', contextLabels: ['Application procedure'], context: 'body' },
    { label: '주소 변경신고서', selector: '#unscoped-form', href: 'https://example.test/material/9', context: 'body' },
    { label: '전자책 다운로드', selector: '#book-download', action: 'locate', contextLabels: ['회원증 발급'], context: 'body' },
    { label: '주소 변경신고서', selector: '#article-form', href: 'https://example.test/material/10', sectionLabel: '서식자료', context: 'body' },
    { label: '주소 변경신고서', selector: '#notice-form', href: 'https://example.test/notice?articleNo=11', sectionLabel: '서식자료', context: 'body' },
    { label: '주소 변경신고서', selector: '#contrary-form', href: 'https://example.test/login', sectionLabel: '서식자료', context: 'body' },
  ], '<table><tbody><tr><td><a id="form-detail" href="/material/detail?record=8">주소 변경신고서</a></td><td><a id="unscoped-form" href="/material/9">주소 변경신고서</a></td><td><a id="notice-form" href="/notice?articleNo=11">주소 변경신고서</a></td><td><a id="contrary-form" href="/login">주소 변경신고서</a></td></tr></tbody></table><ol><li><a id="form-download" href="/fileDownload/8">수령 위임장 다운받기</a></li><li><button id="english-form">Download consent form</button></li><li><a id="book-download">전자책 다운로드</a></li></ol><article><ul><li><a id="article-form" href="/material/10">주소 변경신고서</a></li></ul></article>');
  expect(classified.map(item => [item.id, item.category])).toEqual([['form-detail', 'apply'], ['form-download', 'apply'], ['english-form', 'apply'], ['notice-form', 'notice']]);
  expect(classified.slice(0, 3).every(item => item.pageTask === 'reading')).toBe(true);
  expect(classified[1].action).toBe('locate');
});

test('납부 정보는 학사 문맥·일반 링크·안내 목적이 모두 필요하며 실제 결제·위험 URL 예외는 없다', async ({ page }) => {
  const specs = [
    { label: '분할납부안내', selector: '#guide', href: 'https://example.test/fees/guide-2', contextLabels: ['학사 학사안내'], context: 'body' },
    { label: '납부 방법', selector: '#method', href: 'https://example.test/fees/method', contextLabels: ['등록금'], context: 'body' },
    { label: '분할납부안내', selector: '#no-context', href: 'https://example.test/fees/guide-3', context: 'body' },
    { label: '분할납부안내', selector: '#button', action: 'locate', contextLabels: ['학사안내'], context: 'body' },
    { label: '납부하기', selector: '#execute', href: 'https://example.test/fees/start', contextLabels: ['등록금'], context: 'body' },
    { label: '등록금 결제 안내', selector: '#checkout', href: 'https://example.test/fees/guide-4', contextLabels: ['등록금'], context: 'body' },
    { label: '삭제 후 납부 안내', selector: '#destructive-label', href: 'https://example.test/fees/guide-5', contextLabels: ['등록금'], context: 'body' },
    { label: '납부안내', selector: '#destructive-url', href: 'https://example.test/fees/%64elete', contextLabels: ['등록금'], context: 'body' },
    { label: '납부안내', selector: '#command', href: 'https://example.test/fees/guide?mode=payment', contextLabels: ['등록금'], context: 'body' },
    { label: '납부안내', selector: '#contrary', href: 'https://example.test/login', contextLabels: ['등록금'], context: 'body' },
    { label: '납부안내', selector: '#article-guide', href: 'https://example.test/articles/42', contextLabels: ['등록금'], context: 'body' },
  ];
  const markup = specs.map(spec => spec.selector === '#button' ? '<button id="button">분할납부안내</button>' : `<a id="${spec.selector.slice(1)}" href="${spec.href}">${spec.label}</a>`).join('');
  const { classified } = await inspect(page, specs, markup);
  expect(classified.map(item => [item.id, item.category])).toEqual([['guide', 'academic'], ['method', 'academic']]);
  expect(classified.every(item => item.action === 'navigate' && item.pageTask === 'reading')).toBe(true);
  expect(classified.map(item => item.href)).toEqual(specs.slice(0, 2).map(item => item.href));
});

test('안내 예외도 대소문자·인코딩·중복 명령의 위험값과 submit을 막고 일반 검색값은 분류에 쓰지 않는다', async ({ page }) => {
  const safe = ['?q=delete&searchText=payment', '?mode=view&q=submit'];
  const unsafe = ['?Action=delete', '?ACTION=PAYMENT', '?%41CTION=LOGOUT', '?Payment=1', '?mode=view&mode=delete', '?action=view&action=payment', '?action=view&ACTION=delete', '?cmd=%70ayment', '?command=submit', '?MODE=finalSubmit', '?task=submitFinal'];
  const specs = [...safe, ...unsafe].map((query, index) => ({ label: '분할납부안내', selector: `#info-${index}`, href: `https://example.test/fees/guide${query}`, contextLabels: ['학사안내'], context: 'body' }));
  const { classified } = await inspect(page, specs, specs.map(spec => `<a id="${spec.selector.slice(1)}" href="${spec.href}">분할납부안내</a>`).join(''));
  expect(classified.map(item => item.id)).toEqual(['info-0', 'info-1']);
});

test('발급·재발급 기능명 문법은 신청 경로이며 발급 주제의 연구·기사는 아니다', async ({ page }) => {
  const positive = ['온라인 재발급 안내 바로가기', '회원증 발급', '자격증 발급 방법'];
  const { classified } = await inspect(page, [
    ...positive.map((label, index) => ({ label, href: `https://example.test/services/issue-${index}`, context: 'body' })),
    { label: '재발급 제도 연구 발표', href: 'https://example.test/updates/report', context: 'body' },
    { label: '회원증 발급 안내', href: 'https://example.test/articles/report', context: 'body' },
  ]);
  expect(classified.map(item => item.label)).toEqual(positive);
  expect(classified.every(item => item.category === 'apply')).toBe(true);
});

test('짧은 안내 링크는 구체 분류 뒤의 도움말 fallback이며 문서·기사·알려진 모순 URL은 아니다', async ({ page }) => {
  const specs = [
    { label: '표준 사진 규격 안내 바로가기', href: 'https://example.test/public/guide', context: 'body' },
    { label: '시설 방문 안내', href: 'https://example.test/public/visit-guide', context: 'body' },
    { label: '예약 안내', href: 'https://example.test/services/book', context: 'body' },
    { label: '학사 안내', href: 'https://example.test/studies/guide', context: 'body' },
    { label: '공지사항 안내', href: 'https://example.test/board/list', context: 'body' },
    { label: '시간 활용 안내', href: 'https://example.test/reading/42', context: 'body' },
    { label: '규격 안내', href: 'https://example.test/read?articleNo=42', context: 'body' },
    { label: '규격 안내', href: 'https://example.test/search', context: 'body' },
    { label: '규격 안내', href: 'https://example.test/news/guide', context: 'body' },
  ].map((spec, index) => ({ ...spec, selector: `#guide-${index}` }));
  const { classified } = await inspect(page, specs, specs.map(spec => `<a id="${spec.selector.slice(1)}" href="${spec.href}">${spec.label}</a>`).join(''));
  expect(classified.map(item => item.category)).toEqual(['help', 'help', 'apply', 'academic', 'notice']);
});

test('약한 안내명 fallback은 명확한 상담 운영 기능을 여섯 카드 밖으로 밀어내지 않는다', async ({ page }) => {
  const specs = [
    { label: '검색어 입력', selector: '#query', action: 'locate', context: 'body' },
    { label: '상담 운영', selector: '#counseling', href: 'https://example.test/services/advice', context: 'body' },
    ...['청사 안내', '시설 방문 안내', '외국어 사용 안내'].map((label, index) => ({ label, selector: `#weak-${index}`, href: `https://example.test/guide/topic-${index}`, context: 'body' })),
    ...[['로그인', 'login'], ['공지사항', 'notice'], ['예약', 'booking'], ['학사안내', 'academic']].map(([label, endpoint], index) => ({ label, selector: `#global-${index}`, href: `https://example.test/${endpoint}`, context: 'primary' })),
  ];
  const markup = '<input id="query" type="text" aria-label="검색어 입력">' + specs.filter(spec => spec.href).map(spec => `<a id="${spec.selector.slice(1)}" href="${spec.href}">${spec.label}</a>`).join('');
  const { classified, ranked } = await inspect(page, specs, markup);
  expect(ranked).toHaveLength(6);
  expect(ranked.some(item => item.id === 'counseling')).toBe(true);
  expect(classified.filter(item => item.id.startsWith('weak-')).every(item => item.pageTask === undefined)).toBe(true);
});

test('본문의 명확한 부서·상담 운영 기능은 전역 검색 중복보다 먼저 두 경로를 보존한다', async ({ page }) => {
  const specs = [
    { label: '검색어 입력', selector: '#query', action: 'locate', context: 'body' },
    { label: '부서안내', selector: '#directory', href: 'https://example.test/services/directory', context: 'body' },
    { label: '온라인 상담 운영', selector: '#counseling', href: 'https://example.test/services/advice', context: 'body' },
    { label: '시설 방문 안내', selector: '#weak-guide', href: 'https://example.test/services/visit-guide', context: 'body' },
    ...[['로그인', 'login'], ['통합검색', 'search'], ['소식알림', 'updates'], ['통합예약시스템', 'booking']].map(([label, endpoint], index) => ({ label, selector: `#global-${index}`, href: `https://example.test/${endpoint}`, context: 'primary' })),
  ];
  const markup = '<input id="query" type="text" aria-label="검색어 입력">' + specs.filter(spec => spec.href).map(spec => `<a id="${spec.selector.slice(1)}" href="${spec.href}">${spec.label}</a>`).join('');
  const { classified, ranked } = await inspect(page, specs, markup);
  expect(ranked).toHaveLength(6);
  expect(ranked.filter(item => item.category === 'help').map(item => item.id)).toEqual(['directory', 'counseling']);
  expect(ranked.filter(item => item.category === 'search').map(item => item.id)).toEqual(['query']);
  expect(classified.find(item => item.id === 'weak-guide').pageTask).toBeUndefined();
});

test('학사 제목 아래 목록의 교육 개념·지침은 읽기이며 신청·FAQ 의도와 기사는 별개다', async ({ page }) => {
  const specs = ['계절수업', '출석 지침 안내', '교양 과정', '학점 신청', '출석 FAQ'].map((label, index) => ({ label, selector: `#study-${index}`, href: `https://example.test/study/topic-${index}`, contextLabels: ['학사 학사안내'], context: 'body' }));
  specs.push({ label: '계절수업', selector: '#no-academic-context', href: 'https://example.test/services/season', context: 'body' });
  specs.push({ label: '수업 서비스 개편 발표', selector: '#study-report', href: 'https://example.test/updates/report', contextLabels: ['학사안내'], context: 'body' });
  specs.push({ label: '출석 지침 안내', selector: '#study-article', href: 'https://example.test/study/report', contextLabels: ['학사안내'], context: 'body' });
  const normal = specs.filter(spec => spec.selector !== '#study-article').map(spec => `<li><a id="${spec.selector.slice(1)}" href="${spec.href}">${spec.label}</a></li>`).join('');
  const { classified } = await inspect(page, specs, `<ul>${normal}</ul><article><ul><li><a id="study-article" href="/study/report">출석 지침 안내</a></li></ul></article>`);
  expect(classified.map(item => item.category)).toEqual(['academic', 'academic', 'academic', 'apply', 'help']);
  expect(classified.slice(0, 3).every(item => item.pageTask === 'reading')).toBe(true);
});

test('명확한 FAQ 제목과 표·목록의 질문형 문장은 abbr 없이도 질문 읽기다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '서비스 장애는 어디에서 문의하나요?', selector: '#faq-row', pagePurpose: 'help', action: 'locate', context: 'body' },
    { label: '어떤 절차로 이용하여야 합니까?', selector: '#faq-item', contextLabels: ['자주 묻는 질문'], action: 'locate', context: 'body' },
    { label: '서비스 장애는 어디에서 접수하나요?', selector: '#ordinary-question', action: 'locate', context: 'body' },
    { label: '절차가 새롭게 바뀌었습니다', selector: '#statement', pagePurpose: 'help', action: 'locate', context: 'body' },
  ], '<table><tbody><tr><td><a id="faq-row" href="#">서비스 장애는 어디에서 문의하나요?</a></td></tr></tbody></table><ul><li><button id="faq-item">어떤 절차로 이용하여야 합니까?</button></li><li><a id="ordinary-question">서비스 장애는 어디에서 접수하나요?</a></li><li><a id="statement">절차가 새롭게 바뀌었습니다</a></li></ul>');
  expect(classified.filter(item => item.pageTask === 'reading').map(item => item.id)).toEqual(['faq-row', 'faq-item']);
});

test('정의 목록의 답변 열기 표시는 질문 읽기이며 marker 없는 dt·일반 버튼·기사는 아니다', async ({ page }) => {
  const { classified } = await inspect(page, ['answer', 'term-marker', 'unmarked', 'outside', 'article-answer'].map(id => ({ label: '첫 방문에는 어떤 절차가 필요한가요?', selector: `#${id}`, action: 'locate', context: 'body' })), '<dl><dt><a id="answer" href="#" title="답변 열기">첫 방문에는 어떤 절차가 필요한가요?</a></dt></dl><dl><dt title="답변 보기"><button id="term-marker">첫 방문에는 어떤 절차가 필요한가요?</button></dt></dl><dl><dt><a id="unmarked">첫 방문에는 어떤 절차가 필요한가요?</a></dt></dl><button id="outside" title="답변 열기">첫 방문에는 어떤 절차가 필요한가요?</button><article><dl><dt><a id="article-answer" title="답변 열기">첫 방문에는 어떤 절차가 필요한가요?</a></dt></dl></article>');
  expect(classified.map(item => [item.id, item.category, item.pageTask])).toEqual([['answer', 'help', 'reading'], ['term-marker', 'help', 'reading']]);
});

test('기관 지사·센터 목록은 도움말이며 안전한 placeholder 검색 입력은 검색 의미가 우선한다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '지사/센터 전체보기', href: 'https://example.test/organization/directory', context: 'body' },
    { label: '사업소 목록', href: 'https://example.test/organization/offices', context: 'body' },
    { label: 'Branch directory', href: 'https://example.test/organization/branches', context: 'body' },
    { label: '지사찾기', selector: '#branch-search', action: 'locate', context: 'body', forbidValueRead: true },
    { label: '지사 운영 성과 발표', href: 'https://example.test/updates/report', context: 'body' },
  ], '<input id="branch-search" type="text" title="지사찾기" placeholder="검색어를 입력하세요.">');
  expect(classified.map(item => item.category)).toEqual(['help', 'help', 'help', 'search']);
  expect(classified.at(-1).label).toBe('지사찾기');
});

test('명시적 문서 다운로드는 확장자를 의미 판정에서만 빼고 발급·사용안내·법령 읽기를 구별한다', async ({ page }) => {
  const specs = [
    { label: '회원증 발급방법.pdf', selector: '#issue-file', action: 'locate', context: 'body' },
    { label: '장비 설치 및 사용안내.hwpx', selector: '#help-file', action: 'locate', context: 'body' },
    { label: '시설 운영에 관한 조례 [별표3]', selector: '#legal-file', action: 'locate', context: 'body' },
    { label: '운영 규정.pdf', selector: '#rules-file', action: 'locate', context: 'body' },
    { label: '시설 운영에 관한 조례', selector: '#plain-legal', href: 'https://example.test/pages/legal', context: 'body' },
    { label: '결제방법.pdf', selector: '#risky-file', action: 'locate', context: 'body' },
    { label: '조례 개정 연구 발표.pdf', selector: '#topic-file', action: 'locate', context: 'body' },
  ];
  const { classified } = await inspect(page, specs, '<a id="issue-file" href="/files/issue" title="문서 다운로드">회원증 발급방법.pdf</a><a id="help-file" href="/files/help" download>장비 설치 및 사용안내.hwpx</a><a id="legal-file" href="/files/legal" title="다운로드">시설 운영에 관한 조례 [별표3]</a><a id="rules-file" href="/files/rules" title="PDF download">운영 규정.pdf</a><a id="plain-legal" href="/pages/legal">시설 운영에 관한 조례</a><a id="risky-file" href="/files/payment" download>결제방법.pdf</a><a id="topic-file" href="/files/topic" download>조례 개정 연구 발표.pdf</a>');
  expect(classified.map(item => [item.id, item.category])).toEqual([['issue-file', 'apply'], ['help-file', 'help'], ['legal-file', 'help'], ['rules-file', 'help']]);
  expect(classified.map(item => item.label)).toEqual(specs.slice(0, 4).map(item => item.label));
  expect(classified.every(item => item.action === 'locate')).toBe(true);
});

test('안내 문맥의 접이식 정보 패널은 도움말이며 실제 신청·삭제·폼 제출과 문맥 없는 토글은 아니다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '보조 서비스와 비용 기준', selector: '#panel', action: 'locate', contextLabels: ['시설 이용안내'], context: 'body' },
    { label: '선택형 교육 프로그램', selector: '#training', action: 'locate', contextLabels: ['교육안내'], context: 'body' },
    { label: '예약', selector: '#booking-panel', action: 'locate', contextLabels: ['교육안내'], context: 'body' },
    { label: '삭제', selector: '#unsafe-panel', action: 'locate', contextLabels: ['교육안내'], context: 'body' },
    { label: '보조 서비스', selector: '#no-heading', action: 'locate', context: 'body' },
    { label: '보조 서비스', selector: '#no-expanded', action: 'locate', contextLabels: ['교육안내'], context: 'body' },
    { label: '보조 서비스', selector: '#submit-panel', action: 'locate', contextLabels: ['교육안내'], context: 'body' },
  ], '<button id="panel" aria-expanded="false">보조 서비스와 비용 기준</button><button id="training" aria-expanded="true">선택형 교육 프로그램</button><button id="booking-panel" aria-expanded="false">예약</button><button id="unsafe-panel" aria-expanded="false">삭제</button><button id="no-heading" aria-expanded="false">보조 서비스</button><button id="no-expanded">보조 서비스</button><form><button id="submit-panel" type="submit" aria-expanded="false">보조 서비스</button></form>');
  expect(classified.map(item => [item.id, item.category])).toEqual([['panel', 'help'], ['training', 'help'], ['booking-panel', 'apply']]);
});

test('채용·입찰·모집 공고 목록의 글은 신청 주제여도 공지 읽기이며 기사 표는 아니다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '연구 인력 추가 선발', selector: '#recruit', href: 'https://example.test/public/record-a', contextLabels: ['채용공고'], sectionLabel: '채용공고', context: 'body' },
    { label: '시설 공사 신청 안내', selector: '#tender', href: 'https://example.test/public/record-b', sectionLabel: '입찰 공고', context: 'body' },
    { label: '지역 행사 참가자 접수', selector: '#recruitment', href: 'https://example.test/public/record-c', sectionLabel: '모집공고', context: 'body' },
    { label: '시설 공사 신청 안내', selector: '#article-list', href: 'https://example.test/analysis/record-d', sectionLabel: '입찰공고', context: 'body' },
  ], '<table><tbody><tr><td><a id="recruit" href="/public/record-a">연구 인력 추가 선발</a></td><td><a id="tender" href="/public/record-b">시설 공사 신청 안내</a></td><td><a id="recruitment" href="/public/record-c">지역 행사 참가자 접수</a></td></tr></tbody></table><article><table><tbody><tr><td><a id="article-list" href="/analysis/record-d">시설 공사 신청 안내</a></td></tr></tbody></table></article>');
  expect(classified.map(item => [item.id, item.category])).toEqual([['recruit', 'notice'], ['tender', 'notice'], ['recruitment', 'notice']]);
});

test('학생 지원·학교생활 제목의 짧은 지역 목적지는 학사 읽기이며 임의 본문·기사·신청은 구별한다', async ({ page }) => {
  const specs = [
    { label: '동쪽 학습관', selector: '#local-east', href: 'https://example.test/students/east', contextLabels: ['학생지원 대학생활'], context: 'body' },
    { label: '공동 생활관', selector: '#local-shared', href: 'https://example.test/students/shared', contextLabels: ['학교생활'], context: 'body' },
    { label: '동쪽 학습관', selector: '#unscoped-local', href: 'https://example.test/students/ordinary', context: 'body' },
    { label: '동쪽 학습관', selector: '#unlisted-local', href: 'https://example.test/students/other', contextLabels: ['학생지원'], context: 'body' },
    { label: '동쪽 학습관', selector: '#document-local', href: 'https://example.test/students/read?postId=42', contextLabels: ['학생지원'], context: 'body' },
    { label: '회원증 발급 안내', selector: '#specific-issue', href: 'https://example.test/students/issue', contextLabels: ['학생지원'], context: 'body' },
  ];
  const { classified } = await inspect(page, specs, '<ul><li><a id="local-east" href="/students/east">동쪽 학습관</a></li><li><a id="local-shared" href="/students/shared">공동 생활관</a></li><li><a id="unscoped-local" href="/students/ordinary">동쪽 학습관</a></li><li><a id="document-local" href="/students/read?postId=42">동쪽 학습관</a></li><li><a id="specific-issue" href="/students/issue">회원증 발급 안내</a></li></ul><a id="unlisted-local" href="/students/other">동쪽 학습관</a>');
  expect(classified.map(item => [item.id, item.category])).toEqual([['local-east', 'academic'], ['local-shared', 'academic'], ['specific-issue', 'apply']]);
});

test('공지 제목의 일반 동의어를 허용하되 장식된 더보기에는 endpoint 확인을 유지한다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '★ 학내 소식 더보기', sectionLabel: '통합공지', href: 'https://example.test/notice.do', context: 'body' },
    { label: '더보기', sectionLabel: '주요 공지사항', href: 'https://example.test/board/list', context: 'body' },
    { label: '더보기', sectionLabel: '전체공지', href: 'https://example.test/board/list', context: 'body' },
    { label: '더보기', sectionLabel: '공지사항이 달라집니다', href: 'https://example.test/updates/42', context: 'body' },
    { label: '★ 학내 소식 더보기', sectionLabel: '통합공지', href: 'https://example.test/updates/list', context: 'body' },
  ]);
  expect(classified.map(item => item.category)).toEqual(['notice', 'notice', 'notice']);
});

test('알려진 공지 문서는 읽기 대상으로 분류하고 제목의 학사·등록금을 업무로 오인하지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '학사시험 일정 안내', href: 'https://example.test/notice.do?mode=view&articleNo=42', context: 'body' },
    { label: '등록금 지원 안내', href: 'https://example.test/notice.do?articleId=43', context: 'body' },
    { label: '더보기', sectionLabel: '통합공지', href: 'https://example.test/notice.do?action=read&postId=44', context: 'body' },
    { label: '공지사항', href: 'https://example.test/notice.do?mode=list', context: 'body' },
    { label: '계정', href: 'https://example.test/login', context: 'body' },
  ]);
  expect(classified.map(item => item.label)).toEqual(['학사시험 일정 안내', '등록금 지원 안내', '공지사항']);
  expect(classified.every(item => item.category === 'notice')).toBe(true);
  expect(classified.slice(0, 2).every(item => item.reasons.join(' ').includes('문서 읽기'))).toBe(true);
});

test('명확한 공지 제목과 목록 구조는 불투명한 문서 URL을 보완하며 실제 액션을 보존한다', async ({ page }) => {
  const { classified, ranked } = await inspect(page, [
    { label: '업무시간 조정 안내', sectionLabel: '새소식', selector: '#hours', href: 'https://example.test/posts/detail?record=7', context: 'body' },
    { label: '학사 일정 변경 안내', sectionLabel: '공지사항', selector: '#academic-post', action: 'locate', context: 'body' },
    { label: '검색 서비스 개편 안내', sectionLabel: '연구 결과', selector: '#story', href: 'https://example.test/articles/search', context: 'body' },
    { label: '수강신청 변경 안내', sectionLabel: '공지사항', selector: '#conflict', href: 'https://example.test/search', context: 'body' },
  ], '<table><tbody><tr><td><a id="hours" href="/posts/detail?record=7">업무시간 조정 안내</a></td></tr></tbody></table><ul><li><a id="academic-post" href="#notice">학사 일정 변경 안내</a></li></ul><article><a id="story" href="/articles/search">검색 서비스 개편 안내</a></article><table><tbody><tr><td><a id="conflict" href="/search">수강신청 변경 안내</a></td></tr></tbody></table>');
  expect(classified.map(item => [item.category, item.action])).toEqual([['notice', 'navigate'], ['notice', 'locate']]);
  expect(ranked).toHaveLength(2);
  expect(classified.every(item => item.reasons.join(' ').includes('문서 읽기'))).toBe(true);
});

test('위험 문구와 위험 URL·명령 쿼리를 모두 거절하고 잘못된 URL에 견딘다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '삭제 신청', href: 'https://example.test/apply' },
    { label: 'Final submit application', href: 'https://example.test/application' },
    { label: 'Sign out', href: 'https://example.test/login' },
    { label: '로그인', href: 'https://example.test/account/logout' },
    { label: '신청 조회', href: 'https://example.test/account/%64elete-confirm' },
    { label: '이용안내', href: 'https://example.test/support?action=payment' },
    { label: '예약', href: 'https://example.test/reservation?mode=final_submit' },
    { label: '검색', href: 'not a valid absolute URL' },
    { label: '공지사항', href: 'javascript:alert(1)' },
  ]);
  expect(classified).toEqual([]);
});

test('하단은 문구와 강한 URL이 함께 있어야 보조 후보가 된다', async ({ page }) => {
  const { classified, ranked } = await inspect(page, [
    { label: '바로가기', href: 'https://example.test/login', context: 'footer' },
    { label: '로그인', href: 'https://example.test/account', context: 'footer' },
    { label: '로그인', href: 'https://example.test/login', context: 'footer' },
    { label: '도움말', href: 'https://example.test/help', context: 'primary' },
  ]);
  expect(classified.map(item => item.href)).toEqual(['https://example.test/login', 'https://example.test/help']);
  expect(ranked.map(item => item.category)).toEqual(['help', 'login']);
});

test('목적지 중복은 분류와 독립적으로 제거하고 주요 메뉴를 남긴다', async ({ page }) => {
  const { directRanked } = await inspect(page, [
    { label: '이용 안내', href: 'https://example.test/common', category: 'help', score: 70 },
    { label: '공지사항', href: 'https://example.test/common', category: 'notice', score: 85 },
    { label: '로그인', href: 'https://example.test/login', category: 'login', score: 58, context: 'footer' },
    { label: '로그인', href: 'https://example.test/login', category: 'login', score: 85 },
  ]);
  expect(directRanked.map(item => [item.label, item.context])).toEqual([['로그인', 'primary'], ['공지사항', 'primary']]);
  expect(new Set(directRanked.map(item => item.href)).size).toBe(directRanked.length);
});

test('분류 다양성을 먼저 확보하고 같은 분류의 별개 중요 기능도 보존한다', async ({ page }) => {
  const { directRanked } = await inspect(page, [
    { label: '학사일정', href: 'https://example.test/calendar', category: 'academic', score: 95 },
    { label: '수강신청', href: 'https://example.test/enrol', category: 'academic', score: 94 },
    { label: '등록금 조회', href: 'https://example.test/tuition', category: 'academic', score: 93 },
    { label: '공지사항', href: 'https://example.test/notice', category: 'notice', score: 82 },
    { label: '검색', href: 'https://example.test/search', category: 'search', score: 81 },
    { label: '이용안내', href: 'https://example.test/help', category: 'help', score: 80 },
    { label: '예약', href: 'https://example.test/reservation', category: 'apply', score: 79 },
  ]);
  expect(directRanked).toHaveLength(6);
  expect(directRanked.filter(item => item.category === 'academic').map(item => item.label)).toEqual(['학사일정', '수강신청']);
  expect(new Set(directRanked.map(item => item.category)).size).toBe(5);
});

test('업무가 집중된 페이지에서도 세 가지 별개 도움 기능을 보존하되 전체는 여섯 개 이하다', async ({ page }) => {
  const { directRanked } = await inspect(page, [
    { label: '검색', href: 'https://example.test/search', category: 'search', score: 90 },
    { label: '로그인', href: 'https://example.test/login', category: 'login', score: 89 },
    { label: 'FAQ 목록', href: 'https://example.test/faq', category: 'help', score: 85 },
    { label: '질문 읽기', selector: '#question', action: 'locate', category: 'help', score: 72 },
    { label: '안내 전자책', href: 'https://example.test/faq/ebook', category: 'help', score: 70 },
  ], '<button id="question">질문 읽기</button>');
  expect(directRanked).toHaveLength(5);
  expect(directRanked.filter(item => item.category === 'help')).toHaveLength(3);
});

test('전역 여섯 분류가 있어도 현재 학사일정의 보기 두 모드와 행사를 먼저 보존한다', async ({ page }) => {
  const globals = ['login', 'search', 'notice', 'academic', 'help', 'apply'].map((category, index) => ({ label: `global-${category}`, category, score: 97 - index, context: 'primary', href: `https://example.test/global/${category}` }));
  const { directRanked } = await inspect(page, [
    ...globals,
    { label: '달력으로 일정 보기', selector: '#calendar-mode', category: 'academic', score: 72, context: 'body', pageTask: 'control', pagePurpose: 'academic-calendar', href: 'https://example.test/schedule?mode=calendar' },
    { label: '리스트로 일정 보기', selector: '#list-mode', category: 'academic', score: 72, context: 'body', pageTask: 'control', pagePurpose: 'academic-calendar', href: 'https://example.test/schedule?mode=list' },
    { label: '2032-1학기 기말고사', selector: '#calendar-event', category: 'academic', score: 60, context: 'body', pageTask: 'reading', pagePurpose: 'academic-calendar', action: 'locate' },
  ], '<main><a id="calendar-mode">달력으로 일정 보기</a><a id="list-mode">리스트로 일정 보기</a><table><tbody><tr><td><a id="calendar-event">2032-1학기 기말고사</a></td></tr></tbody></table></main>');
  expect(directRanked).toHaveLength(6);
  expect(directRanked.filter(item => item.category === 'academic').map(item => item.id)).toEqual(['calendar-mode', 'list-mode', 'calendar-event']);
  expect(new Set(directRanked.map(item => item.category)).size).toBe(4);
});

test('같은 분류의 지역 목차는 전역 메뉴보다 우선하고 단순 본문 문구는 예약 슬롯이 아니다', async ({ page }) => {
  const { directRanked } = await inspect(page, [
    { label: '신청', selector: '#global-apply', category: 'apply', score: 97, context: 'primary', href: 'https://example.test/global/apply' },
    { label: '여권 신청안내', selector: '#local-apply', category: 'apply', score: 85, context: 'primary', href: 'https://example.test/local/passport' },
    { label: '신청 서비스 개편 안내', selector: '#plain-body', category: 'apply', score: 70, context: 'body', href: 'https://example.test/updates/42' },
    ...['login', 'search', 'notice', 'academic', 'help'].map((category, index) => ({ label: category, category, score: 96 - index, context: 'primary', href: `https://example.test/global/${category}` })),
  ], '<header><nav><a id="global-apply">신청</a></nav></header><main><nav><a id="local-apply">여권 신청안내</a></nav><a id="plain-body">신청 서비스 개편 안내</a></main>');
  expect(directRanked).toHaveLength(6);
  expect(directRanked.filter(item => item.category === 'apply').map(item => item.id)).toEqual(['local-apply']);
});

test('지역 목차의 별개 leaf 목적지는 현재 페이지 재진입·상위 그룹 토글보다 우선한다', async ({ page }) => {
  await page.route('https://example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<main></main>' }));
  await page.goto('https://example.test/services/current');
  const { directRanked } = await inspect(page, [
    { label: '신청', selector: '#group', category: 'apply', score: 85, context: 'primary', action: 'locate' },
    { label: '신청 안내', selector: '#current', category: 'apply', score: 85, context: 'primary', href: 'https://example.test/services/current' },
    { label: '회원 신청 안내', selector: '#current-marked', category: 'apply', score: 85, context: 'primary', href: 'https://example.test/services/current-alias' },
    { label: '도서 이용 신청 안내', selector: '#leaf', category: 'apply', score: 85, context: 'primary', href: 'https://example.test/services/reader' },
    ...['login', 'search', 'notice', 'academic', 'help', 'apply'].map((category, index) => ({ label: category, category, score: 97 - index, context: 'primary', href: `https://example.test/global/${category}` })),
  ], '<main><nav><ul><li><button id="group" aria-expanded="true">신청</button><ul><li><a id="current" href="/services/current">신청 안내</a></li><li><a id="current-marked" aria-current="page" href="/services/current-alias">회원 신청 안내</a></li><li><a id="leaf" href="/services/reader">도서 이용 신청 안내</a></li></ul></li></ul></nav></main>');
  expect(directRanked).toHaveLength(6);
  expect(directRanked.filter(item => item.category === 'apply').map(item => item.id)).toEqual(['leaf']);
});

test('같은 공지 목록의 읽기 순서는 제목 철자보다 우선하며 무관한 DOM·입력배열 변화는 무관하다', async ({ page }) => {
  const specs = [
    { label: 'Z 운영시간 조정', selector: '#first-notice', category: 'notice', score: 60, context: 'body', pageTask: 'reading', href: 'https://example.test/posts/z' },
    { label: 'A 서비스 안내', selector: '#second-notice', category: 'notice', score: 60, context: 'body', pageTask: 'reading', href: 'https://example.test/posts/a' },
  ];
  const first = await inspect(page, specs, '<ul><li><a id="first-notice">Z 운영시간 조정</a></li><li><a id="second-notice">A 서비스 안내</a></li></ul>');
  const second = await inspect(page, [...specs].reverse(), '<aside>무관한 광고</aside><ul><li><a id="first-notice">Z 운영시간 조정</a></li><li><a id="second-notice">A 서비스 안내</a></li></ul><p>무관한 기사</p>');
  expect(first.directRanked.map(item => item.id)).toEqual(['first-notice', 'second-notice']);
  expect(second.directRanked.map(item => item.id)).toEqual(['first-notice', 'second-notice']);
});

test('여러 읽기 목록을 섞어도 비교 순환 없이 모든 입력 순열에서 같은 결과를 낸다', async ({ page }) => {
  const specs = ['z', 'a', 'm'].map(id => ({ label: `${id.toUpperCase()} notice`, selector: `#${id}`, category: 'notice', score: 60, context: 'body', pageTask: 'reading', href: `https://example.test/posts/${id}` }));
  const markup = '<ul><li><a id="z">Z notice</a></li><li><a id="a">A notice</a></li></ul><ul><li><a id="m">M notice</a></li></ul>';
  const results = [];
  for (const permutation of [[0, 1, 2], [2, 1, 0], [1, 0, 2], [2, 0, 1], [1, 2, 0], [0, 2, 1]]) {
    const { directRanked } = await inspect(page, permutation.map(index => specs[index]), markup);
    results.push(directRanked.map(item => item.id));
  }
  expect(new Set(results.map(ids => ids.join(','))).size).toBe(1);
  expect(results[0].indexOf('z')).toBeLessThan(results[0].indexOf('a'));
});

test('동작형 중복은 원본 요소를 기준으로 하고 같은 문구의 별개 제어는 합치지 않는다', async ({ page }) => {
  const { directRanked } = await inspect(page, [
    { label: '검색', selector: '#one', category: 'search', score: 90 },
    { label: '자료 검색', selector: '#one', category: 'help', score: 80 },
    { label: '검색', selector: '#two', category: 'search', score: 85 },
  ], '<button id="one">검색</button><button id="two">검색</button>');
  expect(directRanked.map(item => item.id)).toEqual(['one', 'two']);
});

test('정규화된 같은 URL만 합치며 쿼리·앵커가 다른 목적지와 위치 안내는 보존한다', async ({ page }) => {
  const { directRanked } = await inspect(page, [
    { label: '도움말', href: 'https://EXAMPLE.TEST:443/help', category: 'help', score: 90 },
    { label: '이용 안내', href: 'https://example.test/help', category: 'notice', score: 85 },
    { label: '학사일정', href: 'https://example.test/service?task=calendar', category: 'academic', score: 84 },
    { label: '수강신청', href: 'https://example.test/service?task=enrol', category: 'academic', score: 83 },
    { label: '예약', href: 'https://example.test/service#booking', category: 'apply', score: 82 },
    { label: '검색', action: 'locate', selector: '#source-search', category: 'search', score: 81 },
  ], '<button id="source-search">검색</button>');
  expect(directRanked).toHaveLength(5);
  expect(directRanked.some(item => item.label === '이용 안내')).toBe(false);
  expect(directRanked.filter(item => item.category === 'academic')).toHaveLength(2);
  expect(directRanked.find(item => item.category === 'search').action).toBe('locate');
});

test('동점 순서는 관계없는 DOM 순서와 입력 배열 순서에 흔들리지 않는다', async ({ page }) => {
  const items = [
    { label: '예약', href: 'https://example.test/z', category: 'apply', score: 80 },
    { label: '예약', href: 'https://example.test/a', category: 'apply', score: 80 },
    { label: '검색', href: 'https://example.test/search', category: 'search', score: 80 },
    { label: '도움말', href: 'https://example.test/help', category: 'help', score: 80 },
  ];
  const first = await inspect(page, items, '<p>무관한 본문</p>');
  const second = await inspect(page, [...items].reverse(), '<aside>추가 본문</aside><p>무관한 본문</p>');
  expect(first.directRanked.map(item => item.href)).toEqual(second.directRanked.map(item => item.href));
});

test('구조가 달라져도 식별 가능한 같은 이름 제어의 동점 순서는 유지한다', async ({ page }) => {
  const items = [
    { label: '검색', selector: '#book-search', action: 'locate', category: 'search', score: 80 },
    { label: '검색', selector: '#site-search', action: 'locate', category: 'search', score: 80 },
  ];
  const first = await inspect(page, items, '<button id="book-search">검색</button><button id="site-search">검색</button>');
  const second = await inspect(page, [...items].reverse(), '<p>관련 없는 콘텐츠</p><button id="site-search">검색</button><button id="book-search">검색</button>');
  expect(first.directRanked.map(item => item.id)).toEqual(['book-search', 'site-search']);
  expect(second.directRanked.map(item => item.id)).toEqual(['book-search', 'site-search']);
});

test('명확한 본문 신청과 예약은 전역 메뉴가 많아도 현재 페이지 제어로 보존한다', async ({ page }) => {
  await page.setContent('<header><nav><a href="https://example.test/login">로그인</a><a href="https://example.test/search">검색</a><a href="https://example.test/notice">공지사항</a><a href="https://example.test/academic">학사정보</a><a href="https://example.test/help">도움말</a></nav></header><main><h1>주민 서비스</h1><a id="passport" href="https://example.test/service/a">여권 신청</a><a id="waste" href="https://example.test/service/b">대형폐기물 신청하기</a></main>');
  await page.addScriptTag({ content: engine });
  const actual = await page.evaluate(() => {
    const classified = SyntheticEngine.classify(SyntheticEngine.analyzePage());
    return { controls: classified.filter(c => c.context === 'body').map(c => [c.element.id, c.pageTask]),
      ranked: SyntheticEngine.rank(classified).map(c => ({ id: c.element.id, category: c.category })) };
  });
  expect(actual.controls).toEqual([['passport', 'control'], ['waste', 'control']]);
  expect(actual.ranked).toHaveLength(6);
  expect(actual.ranked.filter(c => c.category === 'apply')).toHaveLength(2);
  expect(actual.ranked.some(c => c.id === 'waste')).toBe(true);
  const capped = await page.evaluate(() => {
    document.querySelector('main').insertAdjacentHTML('beforeend', '<button id="reserve">체육관 예약</button><a id="fourth" href="https://example.test/service/c">교육 접수</a>');
    const classified = SyntheticEngine.classify(SyntheticEngine.analyzePage());
    return { controls: classified.filter(c => c.pageTask === 'control').length,
      ranked: SyntheticEngine.rank(classified).map(c => c.category) };
  });
  expect(capped.controls).toBe(4);
  expect(capped.ranked).toHaveLength(6);
  expect(capped.ranked.filter(category => category === 'apply')).toHaveLength(3);
});

test('신청을 언급하는 안내나 제출 제어까지 본문 예약 슬롯으로 올리지 않는다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '신청 서비스 개편 안내', selector: '#announcement', href: 'https://example.test/updates/42', context: 'body' },
    { label: '예약 변경 안내', selector: '#guide', href: 'https://example.test/services/guide', context: 'body' },
    { label: '여권 신청 방법', selector: '#method', href: 'https://example.test/services/method', context: 'body' },
    { label: '시설 예약', selector: '#submit', action: 'locate', context: 'body' },
    { label: '시설 신청', selector: '#download', action: 'locate', context: 'body' },
    { label: '여권 신청', selector: '#conflict', href: 'https://example.test/search', context: 'body' },
  ], '<main><a id="announcement" href="/updates/42">신청 서비스 개편 안내</a><a id="guide" href="/services/guide">예약 변경 안내</a><a id="method" href="/services/method">여권 신청 방법</a><form><button id="submit">시설 예약</button></form><a id="download" href="/forms/request.pdf" download>시설 신청</a><a id="conflict" href="/search">여권 신청</a></main>');
  expect(classified).toHaveLength(6);
  expect(classified.every(c => c.pageTask === undefined)).toBe(true);
});

test('article의 서비스는 고정 기능 문구와 완전한 같은 기능 경로가 모두 필요하다', async ({ page }) => {
  const specs = [
    { label: '체육관 예약하기', selector: '#reservation', href: 'https://example.test/reservation', context: 'body' },
    { label: '로그인', selector: '#login', href: 'https://example.test/login', context: 'body' },
    { label: '예약 방법이 달라집니다', selector: '#story', href: 'https://example.test/updates/42', context: 'body' },
    { label: '체육관 예약하기', selector: '#label-only', href: 'https://example.test/updates/43', context: 'body' },
    { label: '자세히 보기', selector: '#endpoint-only', href: 'https://example.test/reservation', context: 'body' },
    { label: '체육관 예약하기', selector: '#conflict', href: 'https://example.test/login', context: 'body' },
    { label: '체육관 예약하기', selector: '#news-path', href: 'https://example.test/news/reservation', context: 'body' },
    { label: '체육관 예약하기', selector: '#document', href: 'https://example.test/reservation?articleNo=3', context: 'body' },
    { label: '체육관 예약하기', selector: '#dangerous', href: 'https://example.test/reservation?action=payment', context: 'body' },
  ];
  const markup = `<main>${specs.map(c => `<article><a id="${c.selector.slice(1)}" href="${c.href}">${c.label}</a></article>`).join('')}</main>`;
  const { classified } = await inspect(page, specs, markup);
  expect(classified.map(c => [c.id, c.category])).toEqual([['reservation', 'apply'], ['login', 'login']]);
  expect(classified[0].pageTask).toBe('control');
});

test('이웃 section의 공지 제목은 실제 예약 링크의 분류와 예약 슬롯을 바꾸지 않는다', async ({ page }) => {
  await page.setContent('<main><section><h2>공지사항</h2><p>공개된 공지 0건</p></section><section><ul><li><a id="service" href="https://example.test/service/reserve">체육관 예약</a></li></ul></section></main>');
  await page.addScriptTag({ content: engine });
  const actual = await page.evaluate(() => SyntheticEngine.classify(SyntheticEngine.analyzePage()).map(c => [c.element.id, c.category, c.pageTask]));
  expect(actual).toEqual([['service', 'apply', 'control']]);
});

test('같은 공고 목록은 h2부터 h6과 heading 역할의 표제에서 같은 범주를 유지한다', async ({ page }) => {
  for (const heading of ['<h2>채용공고</h2>', '<h4>채용공고</h4>', '<h5>채용공고</h5>', '<h6>채용공고</h6>', '<div role="heading" aria-level="3">채용공고</div>']) {
    await page.setContent(`<main><section>${heading}<ul><li><a id="item" href="https://example.test/post/view?id=33">기간제 근로자 모집 안내</a></li></ul></section></main>`);
    await page.addScriptTag({ content: engine });
    const actual = await page.evaluate(() => SyntheticEngine.classify(SyntheticEngine.analyzePage()).map(c => [c.element.id, c.category, c.pageTask]));
    expect(actual).toEqual([['item', 'notice', 'reading']]);
  }
});

async function inspectContextual(page, markup, url = 'https://example.test/guide') {
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: markup }));
  await page.goto(url);
  await page.addScriptTag({ content: engine });
  return page.evaluate(() => {
    const summarize = candidates => candidates.map(({ element, snapshot, ...candidate }) => ({ id: element.id, ...candidate }));
    const classified = SyntheticEngine.classify(SyntheticEngine.analyzePage());
    return { classified: summarize(classified), ranked: summarize(SyntheticEngine.rank(classified)) };
  });
}

test('문맥으로 보완한 일반 로컬 목차가 구체적인 신청안내 경로를 예약 슬롯에서 밀어내지 않는다', async ({ page }) => {
  const actual = await inspectContextual(page, '<header><nav><a href="/login">로그인</a><a href="/search">통합검색</a><a href="/notice">공지사항</a></nav></header><main><h1>공공 서비스</h1><nav aria-label="연관 메뉴"><ul><li><a id="overview" href="/overview" aria-expanded="false">업무 현황</a></li><li><a id="directory" href="/directory" aria-expanded="false">관련 서식</a></li><li><a id="manual" href="/manual" aria-expanded="false">사용설명서</a></li><li><a id="specific-guide" href="/guide/visit">방문예약 안내</a></li></ul></nav><a id="request" href="/service/start">민원신청 바로가기</a></main>');
  expect(actual.ranked.some(candidate => candidate.id === 'specific-guide')).toBe(true);
  const inferredNavigation = actual.classified.filter(candidate => ['overview','directory','manual'].includes(candidate.id));
  expect(inferredNavigation).toHaveLength(3);
  expect(inferredNavigation.every(candidate => candidate.pageTask === undefined)).toBe(true);
});

test('안내 제목 아래의 공유·인쇄·확대 도구는 내용 패널로 추천하지 않는다', async ({ page }) => {
  const actual = await inspectContextual(page, '<main><h1>시설 이용안내</h1><div><button id="share" aria-expanded="false">공유하기</button><button id="print" aria-expanded="false">인쇄</button><button id="zoom" aria-expanded="false">화면 확대</button><button id="english" aria-expanded="false">Share</button><button id="content" aria-expanded="false">시설 현황</button></div><ul><li><a id="listed-share" href="#share-panel">공유</a></li><li><a id="listed-print" href="#print-panel">Print</a></li><li><a id="guide" href="#guide-panel">사용설명서</a></li></ul><section id="share-panel"></section><section id="print-panel"></section><section id="guide-panel"></section></main>');
  expect(actual.classified.map(candidate => candidate.id)).toEqual(['content']);
});

test('명시적인 발급 시스템 제목과 실제 목록은 고유 이름의 서비스 진입을 설명한다', async ({ page }) => {
  const actual = await inspectContextual(page, '<main><h1>증명 업무</h1><section><h2>온라인 발급 시스템</h2><ul><li><a id="first" href="https://alpha.example.test/portal">한빛 인증원</a></li><li><a id="second" href="javascript:openPortal();">푸른 민원센터</a></li></ul></section></main>');
  expect(actual.classified.map(c => [c.id, c.category, c.pageTask, c.action])).toEqual([['first', 'apply', 'control', 'navigate'], ['second', 'apply', 'control', 'locate']]);
  expect(actual.classified[0].label).toBe('한빛 인증원');
  expect(actual.classified[0].href).toBe('https://alpha.example.test/portal');
});

test('발급 문맥 보완은 다른 기능·문서·전역 메뉴·폼·기사·위험 동작을 덮지 않는다', async ({ page }) => {
  const actual = await inspectContextual(page, '<main><h1>온라인 발급 서비스</h1><ul><li><a id="login" href="/login">로그인</a></li><li><a id="conflict" href="/search">한빛 인증원</a></li><li><a id="document" href="/content?articleNo=42">푸른 민원센터</a></li><li><a id="unsafe" href="/portal?action=delete" onclick="openPortal();">붉은 민원센터</a></li><li><a id="script-danger" href="javascript:deleteAccount();">누리 인증원</a></li><li><a id="download" href="/forms/public.pdf" download>열린 인증원</a></li></ul><form><ul><li><button id="form">별빛 인증원</button></li></ul></form><article><ul><li><a id="article" href="/portal">은하 인증원</a></li></ul></article><header><ul><li><a id="header" href="/portal">바다 인증원</a></li></ul></header><footer><ul><li><a id="footer" href="/portal">하늘 인증원</a></li></ul></footer></main>');
  expect(actual.classified.map(c => [c.id, c.category])).toEqual([['login', 'login']]);
  for (const heading of ['발급 안내', '서식자료', '기관 안내']) {
    const result = await inspectContextual(page, `<main><h1>${heading}</h1><ul><li><a href="/portal">한빛 인증원</a></li><li><a href="/other">푸른 민원센터</a></li></ul></main>`);
    expect(result.classified).toEqual([]);
  }
});

test('행동요령의 짧은 원본 주제 목록은 도움말 읽기이며 JS와 fragment를 그대로 보존한다', async ({ page }) => {
  const actual = await inspectContextual(page, '<main><h1>생활 안전 행동요령</h1><ul><li><a id="storm" href="javascript:showTopic(1);">태풍</a></li><li><a id="flood" href="#flood">침수</a></li></ul><section id="flood"></section></main>');
  expect(actual.classified.map(c => [c.id, c.category, c.pageTask, c.action])).toEqual([['storm', 'help', 'reading', 'locate'], ['flood', 'help', 'reading', 'locate']]);
  expect(actual.classified.every(c => c.pagePurpose === 'help' && c.href === undefined)).toBe(true);
});

test('camelCase의 일반 행동요령·instructions 경로는 실제 주제 목록의 목적만 보완한다', async ({ page }) => {
  for (const pathname of ['/guide/getEmergencyActionTips.do', '/guide/showInstructions.html']) {
    const actual = await inspectContextual(page, '<main><h1>상황별 정보</h1><ul><li><button id="quake">지진</button></li><li><button id="snow">대설</button></li></ul><a id="unlisted" href="/misc">기관 소개</a></main>', `https://example.test${pathname}`);
    expect(actual.classified.map(c => [c.id, c.category])).toEqual([['quake', 'help'], ['snow', 'help']]);
  }
  const lookalike = await inspectContextual(page, '<main><ul><li><button>지진</button></li><li><button>대설</button></li></ul></main>', 'https://example.test/instructionalResearch.do');
  expect(lookalike.classified).toEqual([]);
});

test('주제 탭과 동료의 명시적 정보 개념은 일반 페이지의 정보 목록을 설명한다', async ({ page }) => {
  const actual = await inspectContextual(page, '<main><h1>생활 정보</h1><div role="tablist"><div id="home" role="tab" aria-controls="home-panel">가정</div><div id="public" role="tab" aria-controls="public-panel">공공장소</div><div id="tips" role="tab" aria-controls="tips-panel">안전수칙</div></div><section id="home-panel"></section><section id="public-panel" hidden></section><section id="tips-panel" hidden></section></main>');
  expect(actual.classified.map(c => [c.id, c.category, c.pageTask, c.action])).toEqual([['home', 'help', 'reading', 'locate'], ['public', 'help', 'reading', 'locate'], ['tips', 'help', 'reading', 'locate']]);
  const fragments = await inspectContextual(page, '<main><ul><li><a id="first" href="#public">공공장소</a></li><li><a id="guide" href="#tips">행동요령</a></li></ul><section id="public"></section><section id="tips"></section></main>');
  expect(fragments.classified.map(c => [c.id, c.category])).toEqual([['first', 'help'], ['guide', 'help']]);
});

test('정보 목록 보완에는 명시적 문맥과 실제 구조가 필요하며 다른 강한 기능은 우선한다', async ({ page }) => {
  for (const markup of [
    '<main><h1>도움말</h1><a href="#one">가정</a><a href="#two">공공장소</a></main>',
    '<main><h1>일반 정보</h1><ul><li><a href="#one">가정</a></li><li><a href="#two">공공장소</a></li></ul></main>',
    '<main><h1>도움말</h1><ul><li><a href="#one">가정</a></li></ul></main>',
    '<main><h1>도움말</h1><ul><li><a href="https://other.example.test/one">가정</a></li><li><a href="https://other.example.test/two">공공장소</a></li></ul></main>',
    '<main><h1>도움말</h1><form><ul><li><button>가정</button></li><li><button>공공장소</button></li></ul></form></main>',
    '<main><h1>도움말</h1><article><ul><li><a href="#one">가정</a></li><li><a href="#two">공공장소</a></li></ul></article></main>',
    '<main><h1>일반 정보</h1><ul><li><article><a href="#tips">안전수칙</a></article></li><li><a href="#home">가정</a></li></ul></main>',
    '<main><h1>도움말</h1><ul><li><a href="#home">가정</a></li><li><a href="#next">다음</a></li></ul></main>',
  ]) expect((await inspectContextual(page, markup)).classified).toEqual([]);
  const actual = await inspectContextual(page, '<main><h1>도움말</h1><ul><li><a id="apply" href="/apply">시설 예약하기</a></li><li><a id="conflict" href="/login">가정</a></li><li><a id="danger" href="/remove" onclick="openTopic();">공공장소</a></li><li><a id="next" href="#next">다음</a></li><li><a id="topic" href="#topics">학교</a></li></ul></main>');
  expect(actual.classified.map(c => [c.id, c.category])).toEqual([['apply', 'apply'], ['topic', 'help']]);
});
