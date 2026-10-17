import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// Synthetic controls only: this suite neither reads site fixtures nor uses the
// evaluation pages to choose rules. Compile these modules without a global build.
let engine;
test.beforeAll(async () => {
  const sourceRoot = process.env.EASYWEB_ENGINE_ROOT ?? './src';
  const result = await build({
    stdin: {
      contents: `export { classify } from ${JSON.stringify(`${sourceRoot}/classifier.ts`)}; export { rank } from ${JSON.stringify(`${sourceRoot}/ranker.ts`)};`,
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
        element, label: spec.label, href: spec.href,
        context: spec.context ?? 'primary', action: spec.action ?? (spec.href ? 'navigate' : 'locate'),
        score: spec.score ?? 0, category: spec.category, sectionLabel: spec.sectionLabel, reasons: [],
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
    expect(ranked.map(item => item.id)).toEqual(['header-search', 'query']);
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

test('공지 게시글의 학사·등록금 언급은 업무 기능으로 승격하지 않고 목록은 남긴다', async ({ page }) => {
  const { classified } = await inspect(page, [
    { label: '학사시험 일정 안내', href: 'https://example.test/notice.do?mode=view&articleNo=42', context: 'body' },
    { label: '등록금 지원 안내', href: 'https://example.test/notice.do?articleId=43', context: 'body' },
    { label: '더보기', sectionLabel: '통합공지', href: 'https://example.test/notice.do?action=read&postId=44', context: 'body' },
    { label: '공지사항', href: 'https://example.test/notice.do?mode=list', context: 'body' },
    { label: '계정', href: 'https://example.test/login', context: 'body' },
  ]);
  expect(classified.map(item => item.label)).toEqual(['공지사항']);
  expect(classified[0].category).toBe('notice');
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
