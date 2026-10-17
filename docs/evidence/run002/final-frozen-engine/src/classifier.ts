import type { Candidate, Category } from './types';
import { isQuestionCollection } from './analyzer';

const rules: { category: Category; label: RegExp; section: RegExp; endpoints: ReadonlySet<string> }[] = [
  { category: 'login', label: /로그인|\b(?:log[\s-]*in|sign[\s-]*in)\b/i, section: /^(?:로그인|log[\s-]*in|sign[\s-]*in)$/i, endpoints: new Set(['login', 'signin']) },
  { category: 'search', label: /검색|\bsearch\b/i, section: /^(?:(?:통합|자료|정보)?\s*검색|search)$/i, endpoints: new Set(['search']) },
  { category: 'notice', label: /공지|새\s*소식|소식\s*알림|\b(?:notices?|noticeboard|announcements?)\b/i, section: /^(?:(?:(?:통합|주요|전체)\s*)?공지(?:사항)?|새\s*소식|소식\s*알림|notices?|noticeboard|announcements?)$/i, endpoints: new Set(['notice', 'notices', 'announcement', 'announcements']) },
  { category: 'academic', label: /학사|샘물|수강|학적|성적조회|등록금|\bacademics?\b|\bstudent\s+portal\b/i, section: /^(?:학사(?:정보|안내|일정)?|샘물|수강(?:신청|안내)?|학적|성적조회|등록금|academics?|student\s+portal)$/i, endpoints: new Set(['academic', 'academics', 'haksa', 'sugang']) },
  { category: 'help', label: /이용\s*안내|도움말|자주\s*(?:묻는|하는|찾는)\s*질문|검색\s*(?:방법|안내)|뷰어\s*(?:설치\s*)?(?:다운로드|프로그램\s*안내)|(?:민원실|상담)\s*(?:안내|운영)|\b(?:faq|help)\b|\bq\s*&\s*a\b|\bcontact\s+us\b|\buser\s+guide\b|\bsearch\s+(?:help|guide|tips?|instructions)\b|\bviewer\s+(?:install\s+)?download\b/i, section: /^(?:이용\s*안내|도움말|자주\s*(?:묻는|하는|찾는)\s*질문(?:\s*\(FAQ\))?|문의|검색\s*(?:방법|안내)|뷰어\s*(?:설치\s*)?(?:다운로드|프로그램\s*안내)|(?:민원실|상담)\s*(?:안내|운영)|faq|help|q\s*&\s*a|contact\s+us|user\s+guide|search\s+(?:help|guide|tips?|instructions)|viewer\s+(?:install\s+)?download)$/i, endpoints: new Set(['help', 'faq']) },
  { category: 'apply', label: /신청|접수|예약|조회|\b(?:apply|applications?|reservations?|booking)\b/i, section: /^(?:신청(?:\s*[·/]\s*조회)?|접수|예약|조회|apply|applications?|reservations?|booking)$/i, endpoints: new Set(['apply', 'application', 'reservation', 'booking']) },
];

const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const dangerous = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;
const actionKeys = ['action', 'cmd', 'command', 'mode', 'task', 'event', 'method', 'operation', 'do'];
const ambiguousLabel = /^(?:더\s*보기|바로\s*가기|자세히\s*보기|more|read\s*more|open)$/i;
const decoratedMoreLabel = /^.+(?:더\s*보기|\bread\s*more|\bmore)$/i;
const searchGuidanceLabel = /검색\s*(?:방법|안내|도움말)|\bsearch\s+(?:help|guide|tips?|instructions)\b/i;
const explicitApplication = /신청|접수|예약|\b(?:apply|applications?|reservations?|booking)\b/i;
const inquiryWord = /^(?:(?:고객|이용|서비스|민원|상담|전화|온라인|예약|신청|제품|사용|일반))?문의(?:하기|처|사항|안내|게시판)?$/;
const publicNoticeList = /^(?:공고\s*[/·]\s*고시|고시\s*[/·]\s*공고|공고|고시)(?:\s*(?:목록|바로\s*가기))?$/;
const ebookLabel = /^(?:전자책\s*(?:보기|읽기)|e\s*book\s*(?:open|view|read))$/i;
const helpHandoff = /^.{0,40}(?:홈페이지\s*바로\s*가기|(?:go\s+to|visit|open)\s+(?:the\s+)?(?:website|home\s*page))$/i;
const calendarView = /^(?:(?:달력|리스트|목록)(?:으로|로)?\s*일정\s*보기|view\s+schedule\s+as\s+(?:calendar|list)|(?:calendar|list)\s+view)$/i;
const academicEvent = /학기|고사|시험|수업|강의|개강|종강|방학|학사|등록|졸업|입학|수강/;
const noticeCollection = /^(?:(?:공지(?:사항)?|새\s*소식)\s*더\s*보기|(?:notices?|announcements?)\s+(?:read\s*)?more)$/i;
const viewerControl = /뷰어\s*(?:설치\s*)?다운로드|\bviewer\s+(?:install\s+)?download\b/i;
const orderingLabel = /^(?:조회|검색|신청|예약|등록)(?:\s*수)?\s*순$/;

function pathParts(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean).map(part => {
    try { return normalize(decodeURIComponent(part)).toLowerCase(); }
    catch { return part.toLowerCase(); }
  });
}

function isDangerousURL(url: URL, parts: string[]): boolean {
  if (parts.some(part => dangerous.test(part.replace(/[_.-]/g, ' ')))) return true;
  // Only inspect fixed command parameters, never search terms or other values.
  if (actionKeys.some(key => dangerous.test(normalize(url.searchParams.get(key) ?? '')))) return true;
  return ['logout', 'signout', 'delete', 'remove', 'payment', 'checkout', 'final_submit'].some(key => url.searchParams.has(key));
}

function endpoint(parts: string[]): string {
  const names = parts.map(part => part.replace(/\.(?:html?|php|aspx?|jsp|do)$/i, ''));
  const last = names.at(-1) ?? '';
  return /^(?:index|list|main)$/.test(last) ? names.at(-2) ?? '' : last;
}

function hasDocumentReference(url: URL): boolean {
  return actionKeys.some(key => /^(?:view|detail|read)$/i.test(url.searchParams.get(key) ?? ''))
    || ['articleNo', 'articleId', 'article_no', 'article_id', 'postNo', 'postId', 'post_no', 'post_id'].some(key => url.searchParams.has(key));
}

function noticeDocumentEvidence(candidate: Candidate, label: string, section: string, target: string, url?: URL): 'endpoint' | 'collection' | 'conflict' | undefined {
  // Reading a known notice is a distinct task. Its subject must never create
  // an academic/application action, and generic "more" links are not articles.
  if (candidate.context === 'footer' || label.length < 4 || /^\d+$/.test(label) || ambiguousLabel.test(label) || decoratedMoreLabel.test(label)) return;
  const notice = rules.find(rule => rule.category === 'notice')!;
  if (url && notice.endpoints.has(target) && hasDocumentReference(url)) return 'endpoint';
  const listedLink = candidate.element.matches('a[href]') && !!candidate.element.closest('tr, li, [role~="row"], [role~="listitem"]');
  if (!listedLink || !notice.section.test(section)) return;
  if (rules.some(rule => rule.category !== 'notice' && rule.endpoints.has(target))) return 'conflict';
  return 'collection';
}

function isArticle(candidate: Candidate, parts: string[], url?: URL): boolean {
  // Article text can mention any task. Its location is not evidence that it is
  // the corresponding service. Actual search controls remain eligible.
  if (candidate.context === 'body' && candidate.action === 'navigate' && candidate.element.closest('article, [role~="article"]')) return true;
  // Unresolved notice details remain excluded; a positively identified notice
  // document is handled separately before any subject-keyword classification.
  if (url && rules.some(rule => rule.category === 'notice' && rule.endpoints.has(endpoint(parts)))) {
    if (hasDocumentReference(url)) return true;
  }
  const articlePath = parts.some(part => /^(?:news|articles?|stories|story|press)$/.test(part));
  const listLeaf = /^(?:news|articles?|stories|story|press|index|list|main)(?:\.[a-z]+)?$/.test(parts.at(-1) ?? '');
  return articlePath && !listLeaf;
}

function contextualReading(candidate: Candidate, label: string): { category: Category; score: number; reasons: string[]; pageTask: NonNullable<Candidate['pageTask']> } | undefined {
  // Page purpose supplements a specific source control; it never assigns the
  // same category to every link on a help/calendar page.
  if (candidate.context === 'footer' || candidate.element.closest('article, [role~="article"]')) return;
  const contexts = [candidate.sectionLabel, ...(candidate.contextLabels ?? [])].filter((value): value is string => !!value).map(normalize);
  const helpContext = candidate.pagePurpose === 'help' || contexts.some(value => rules.find(rule => rule.category === 'help')!.section.test(value))
    || isQuestionCollection(candidate.element);
  if (helpContext) {
    const questionMarker = [...candidate.element.querySelectorAll(':scope > abbr[title]')]
      .some(marker => /^(?:질문|question)$/i.test(normalize(marker.getAttribute('title') ?? '')));
    if (label.length >= 4 && questionMarker && candidate.element.matches('a, button, [role~="button"]')
      && candidate.element.closest('li, [role~="listitem"]')) {
      return { category: 'help', score: 72, reasons: ['도움말 질문 읽기', '명시적 질문 표시와 도움말 문맥'], pageTask: 'reading' };
    }
    if (helpHandoff.test(label)) return { category: 'help', score: 70, reasons: ['상위 도움말 제목과 홈페이지 연결 제어'], pageTask: 'control' };
  }
  if (candidate.pagePurpose !== 'academic-calendar') return;
  if (candidate.element.matches('a, button, [role~="button"]') && calendarView.test(label)) {
    return { category: 'academic', score: 72, reasons: ['학사일정 보기', '페이지 목적과 명시적 일정 보기 모드'], pageTask: 'control' };
  }
  if (candidate.action === 'locate' && candidate.element.matches('a:not([href])')
    && candidate.element.closest('table, [role~="grid"]') && label.length >= 4 && academicEvent.test(label)) {
    return { category: 'academic', score: 60, reasons: ['학사일정 항목 읽기', '학사일정 목적과 표 안의 원본 행사'], pageTask: 'reading' };
  }
}

export function classify(candidates: Candidate[]): Candidate[] {
  return candidates.flatMap(candidate => {
    // Machine-authored accessible names can separate words with _ or -. This
    // lexical view does not alter source labels, URL paths or action metadata.
    const label = normalize(candidate.label).replace(/[_-]+/g, ' ');
    if (dangerous.test(label) || orderingLabel.test(label)) return [];
    let url: URL | undefined;
    if (candidate.href) {
      try { url = new URL(candidate.href); } catch { return []; }
      if (!/^https?:$/.test(url.protocol)) return [];
    }
    const parts = url ? pathParts(url) : [];
    if (url && isDangerousURL(url, parts)) return [];
    const target = endpoint(parts);
    // The safe candidate name is fixed metadata, never the input's current value.
    const namedTextSearch = candidate.element instanceof HTMLInputElement && ['text', 'search'].includes(candidate.element.type)
      && /검색|\bsearch\b/i.test(label);
    const searchControl = namedTextSearch || candidate.element.matches('input[type="search"], [role~="searchbox"]');
    const searchGuidance = !searchControl && searchGuidanceLabel.test(label);
    // A Korean possessive ending can contain 문의 (방문의/영문의). Require an
    // actual inquiry word or a conventional inquiry compound, not a substring.
    const inquiry = label.split(/[\s\p{P}\p{S}]+/u).some(word => inquiryWord.test(word));
    const section = normalize(candidate.sectionLabel ?? '');
    const knownEndpoint = rules.some(rule => rule.endpoints.has(target));
    const documentEvidence = noticeDocumentEvidence(candidate, label, section, target, url);
    if (documentEvidence === 'conflict') return [];
    if (documentEvidence) {
      return [{
        ...candidate, category: 'notice' as const, score: documentEvidence === 'endpoint' ? 72 : 60,
        reasons: ['공지 문서 읽기', documentEvidence === 'endpoint' ? '공지 경로와 문서 표시' : '공지 제목과 목록 항목'],
        pageTask: 'reading' as const,
      }];
    }
    if (isArticle(candidate, parts, url)) return [];
    const contextual = contextualReading(candidate, label);
    if (contextual && !rules.some(rule => rule.category !== contextual.category && rule.endpoints.has(target))) {
      return [{ ...candidate, ...contextual }];
    }
    // A document viewer label describes a task only when the ordinary HTTP
    // destination independently identifies help/FAQ material. A token boundary
    // accepts dated FAQ folders while rejecting lookalikes such as FAQish.
    if (candidate.context !== 'footer' && url && ebookLabel.test(label)
      && parts.some(part => part.split(/[^\p{L}\p{N}]+/u).some(token => /^(?:faq|help)$/.test(token)))) {
      return [{ ...candidate, category: 'help' as const, score: 72, reasons: ['도움말 문서 읽기', '전자책 제어와 도움말 경로'], pageTask: 'reading' as const }];
    }

    let best: Candidate | undefined;
    let bestIntent = 0;
    for (const rule of rules) {
      const textMatch = (rule.label.test(label) || rule.category === 'help' && inquiry || rule.category === 'notice' && publicNoticeList.test(label))
        && !(rule.category === 'search' && searchGuidance);
      const semanticMatch = rule.category === 'search' && searchControl;
      const urlMatch = !!url && rule.endpoints.has(target);
      const sectionLabel = ambiguousLabel.test(label) || (label.length <= 24 && decoratedMoreLabel.test(label) && urlMatch);
      const sectionMatch = candidate.context !== 'footer' && sectionLabel && rule.section.test(section)
        && (!knownEndpoint || urlMatch) && (urlMatch || label.length <= 14);
      const footerHelp = candidate.context === 'footer' && rule.category === 'help' && textMatch && rule.section.test(label)
        && candidate.action === 'navigate' && !!url;
      // URL-only discovery is deliberate and conservative: a complete endpoint
      // in a primary menu, not a substring, article, footer or body teaser.
      const urlOnly = !textMatch && !semanticMatch && !sectionMatch;
      if (urlOnly && (!urlMatch || candidate.context !== 'primary' || candidate.action !== 'navigate' || label.length > 24)) continue;
      const score = (textMatch ? 60 : semanticMatch ? 62 : sectionMatch ? 48 : 45)
        + (semanticMatch && textMatch ? 12 : 0) + (urlMatch && !urlOnly ? 12 : 0)
        + (candidate.context === 'primary' ? 15 : candidate.context === 'footer' ? footerHelp ? -15 : -25 : 0)
        + (label.length <= 14 ? 10 : label.length > 36 ? -15 : 0);
      // At equal evidence strength, a concrete help/request intent is more
      // specific than a broad subject such as academic/student services.
      const intent = textMatch && rule.category === 'help' ? 2 : textMatch && rule.category === 'apply' && explicitApplication.test(label) ? 1 : 0;
      const reasons = [
        ...(textMatch ? ['고정 문구 일치'] : []),
        ...(semanticMatch ? ['명시적 검색 제어'] : []),
        ...(sectionMatch ? ['주변의 짧은 기능 제목 일치'] : []),
        ...(urlMatch ? ['완전한 URL 기능 경로'] : []),
        ...(footerHelp ? ['하단의 명확한 도움말 링크'] : []),
        candidate.context === 'primary' ? '주요 메뉴 영역' : candidate.context === 'footer' ? '하단 영역 감점' : '본문 영역',
      ];
      if (!best || score > best.score || score === best.score && intent > bestIntent) {
        const pageTask = candidate.context === 'body'
          ? semanticMatch || rule.category === 'help' && viewerControl.test(label) ? 'control'
            : sectionMatch || rule.category === 'notice' && noticeCollection.test(label) ? 'collection' : undefined
          : undefined;
        best = { ...candidate, category: rule.category, score, reasons, pageTask };
        bestIntent = intent;
      }
    }
    return best && best.score >= 55 ? [best] : [];
  });
}
