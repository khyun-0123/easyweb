import type { Candidate, Category } from './types';
import { isQuestionCollection, isSearchControl, isVisible } from './analyzer';
import { isDocumentDownload } from './action-policy';

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
const riskyFlagKeys = new Set(['logout', 'signout', 'delete', 'remove', 'payment', 'checkout', 'final_submit']);
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
const contactHelp = /^(?:(?:조직(?:도)?\s*(?:및|[·/&])\s*)?(?:(?:담당\s*)?(?:부서|직원|담당자)\s*)?(?:전화번호|연락처)\s*(?:안내|찾기)?|조직도(?:\s*안내)?|(?:staff|department|contact)\s+(?:directory|contacts?))$/i;
const hoursHelp = /^(?:(?:이용|운영|개관|업무)\s*시간(?:\s*안내)?|휴관일(?:\s*안내)?|(?:opening|business|service)\s+hours)$/i;
const formTitle = /(?:신청서|신고서|위임장|동의서|청구서|\b(?:application|declaration|authorization|consent|claim)\s+form)$/i;
const formDownload = /(?:(?:신청서|신고서|위임장|동의서|청구서)\s*(?:다운로드|다운\s*받기)|\bdownload\s+(?:application|declaration|authorization|consent|claim)\s+form)$/i;
const formsHeading = /^(?:(?:민원|신청)?\s*서식(?:\s*(?:자료|목록|안내))?|forms?(?:\s+(?:library|downloads?))?)$/i;
const procedureHeading = /^(?:.{1,24})?(?:발급|신청|신고)(?:\s*(?:안내|절차))?$|^(?:application|issuance|registration)(?:\s+(?:guide|procedure|steps))?$/i;
const issuanceIntent = /^(?=.{2,36}$).*(?:재\s*)?발급(?:\s*(?:신청|안내|방법|절차))?(?:\s*바로\s*가기)?$/;
const branchDirectory = /^(?:(?:지사|지점|센터|본부|부서|사업소|사무소)(?:\s*[/·&]\s*(?:지사|지점|센터|본부|부서|사업소|사무소))*\s*(?:전체\s*보기|목록|찾기|안내)|(?:branch(?:es)?|offices?|service\s+centers?)\s+(?:directory|locations?))$/i;
const academicConcept = /수업|강의|학기|출결|출석|성적|이수|학점|학위|졸업|입학|전공|교양|휴학|복학/;
const academicGuideEnd = /(?:수업|강의|학기|출결|출석|성적|이수|학점|학위|졸업|입학|전공|교양|휴학|복학|안내|지침|제도|시간표|일정|규정|요람|과정)(?:\s*바로\s*가기)?$/;
const interrogative = /(?:[?？]|(?:인가요|하나요|되나요|있나요|합니까|됩니까|하습니까)\s*\.?)$/;
const answerToggle = /^(?:답변\s*(?:열기|보기|펼치기)|(?:open|view|show|expand)\s+answer)$/i;
const documentExtension = /\.(?:pdf|hwp|hwpx|docx?|xlsx?|pptx?|odt|rtf)$/i;
const legalDocument = /(?:조례|규정|법령)(?:\s*(?:안내|해설|집))?(?:\s*[\[(][^\])]{1,24}[\])])?$|별표\s*\d+(?:\s*\])?$/;
const noticeListHeading = /^(?:공지\s*공고|(?:채용|입찰|모집)\s*공고)(?:\s*(?:목록|게시판))?$/;
const studentContextHeading = /^(?:학생지원|대학생활|학교생활|student\s+(?:support|life)|campus\s+life)$/i;

function contextsFor(candidate: Candidate, label: string): string[] {
  return [candidate.sectionLabel, ...(candidate.contextLabels ?? [])]
    .filter((value): value is string => !!value).map(normalize).filter(value => value !== label);
}

function hasAcademicContext(candidate: Candidate, label: string): boolean {
  const academic = rules.find(rule => rule.category === 'academic')!;
  return contextsFor(candidate, label).some(value => {
    if (value.length > 60) return false;
    if (academic.section.test(value) || studentContextHeading.test(value)) return true;
    // Several fixed heading spans can form one accessible title. Each piece
    // must itself be an academic heading, rather than arbitrary article text.
    const pieces = value.split(/[\s·/|]+/).filter(Boolean);
    return pieces.length <= 3 && pieces.every(piece => academic.section.test(piece) || studentContextHeading.test(piece));
  });
}

function academicInformation(candidate: Candidate, label: string, target: string, url?: URL): boolean {
  return !!url && candidate.action === 'navigate' && candidate.element.matches('a[href]') && candidate.context !== 'footer'
    && !candidate.element.closest('article, [role~="article"]') && /납부\s*(?:안내|방법|절차|일정)$/.test(label)
    && !dangerous.test(label.replace(/납부/g, '')) && !rules.some(rule => rule.category !== 'academic' && rule.endpoints.has(target))
    && hasAcademicContext(candidate, label);
}

function academicReading(candidate: Candidate, label: string, target: string, url?: URL): boolean {
  return !!url && candidate.action === 'navigate' && candidate.element.matches('a[href]') && candidate.context !== 'footer'
    && !candidate.element.closest('header, article, [role~="banner"], [role~="article"]') && label.length <= 36 && !/[.!?。？]/.test(label)
    && !!candidate.element.closest('nav, li, tr, [role~="navigation"], [role~="listitem"], [role~="row"]')
    && academicConcept.test(label) && academicGuideEnd.test(label) && hasAcademicContext(candidate, label)
    && !rules.some(rule => rule.category !== 'academic' && rule.endpoints.has(target));
}

function academicLocalDestination(candidate: Candidate, label: string, target: string, url?: URL): boolean {
  return !!url && candidate.action === 'navigate' && candidate.element.matches('a[href]') && candidate.context !== 'footer'
    && !candidate.element.closest('header, article, [role~="banner"], [role~="article"]') && label.length >= 2 && label.length <= 24
    && !/[.!?。？]/.test(label) && !/^\d+$/.test(label) && !/(?:발표|보도|기사|연구\s*(?:결과|성과)?)$/.test(label)
    && !hasDocumentReference(url) && !/^\d+(?:\.[a-z]+)?$/i.test(pathParts(url).at(-1) ?? '')
    && !!candidate.element.closest('nav, li, [role~="navigation"], [role~="listitem"]') && hasAcademicContext(candidate, label)
    && !rules.some(rule => rule.category !== 'academic' && rule.endpoints.has(target));
}

function formReading(candidate: Candidate, label: string, target: string, url?: URL): 'document' | 'download' | 'conflict' | undefined {
  if (candidate.context === 'footer' || candidate.element.closest('article, [role~="article"]')) return;
  const contexts = contextsFor(candidate, label);
  const listed = !!candidate.element.closest('tr, li, [role~="row"], [role~="listitem"]');
  const document = !!url && candidate.action === 'navigate' && candidate.element.matches('a[href]')
    && listed && formTitle.test(label) && contexts.some(value => formsHeading.test(value));
  const download = candidate.action === 'locate' && candidate.element.matches('a, button, [role~="button"]')
    && !!candidate.element.closest('ol') && listed && formDownload.test(label) && contexts.some(value => value.length <= 40 && procedureHeading.test(value));
  if (!document && !download) return;
  if (rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) return 'conflict';
  return document ? 'document' : 'download';
}

function pathParts(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean).map(part => {
    try { return normalize(decodeURIComponent(part)).toLowerCase(); }
    catch { return part.toLowerCase(); }
  });
}

function isDangerousURL(url: URL, parts: string[]): boolean {
  if (parts.some(part => dangerous.test(part.replace(/[_.-]/g, ' ')))) return true;
  // Enumerate names only. Read all values only for the fixed command keys,
  // including duplicate values and ASCII case variants. Search text remains
  // outside this decision, even if it contains words such as delete/payment.
  for (const key of url.searchParams.keys()) {
    const folded = key.replace(/[A-Z]/g, letter => letter.toLowerCase());
    if (riskyFlagKeys.has(folded)) return true;
    if (actionKeys.includes(folded) && url.searchParams.getAll(key).some(value => {
      const command = normalize(value);
      return dangerous.test(command) || /^(?:submit|final[\s_-]*submit|submit[\s_-]*final)$/i.test(command);
    })) return true;
  }
  return false;
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
  if (candidate.element.closest('article, [role~="article"]')) return;
  const listedLink = candidate.element.matches('a[href]') && !!candidate.element.closest('tr, li, [role~="row"], [role~="listitem"]');
  if (!listedLink || ![section, ...(candidate.contextLabels ?? [])].some(value => notice.section.test(normalize(value)) || noticeListHeading.test(normalize(value)))) return;
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
  const term = candidate.element.closest('dt');
  const definitionQuestion = !!term?.closest('dl') && isVisible(term) && isVisible(candidate.element)
    && [candidate.element, term].some(element => answerToggle.test(normalize(element.getAttribute('title') ?? '')));
  if (definitionQuestion && label.length >= 4 && candidate.element.matches('a, button, [role~="button"]')) {
    return { category: 'help', score: 72, reasons: ['도움말 질문 읽기', '정의 목록과 명시적 답변 열기 표시'], pageTask: 'reading' };
  }
  if (helpContext) {
    const questionMarker = [...candidate.element.querySelectorAll(':scope > abbr[title]')]
      .some(marker => marker instanceof HTMLElement && isVisible(marker) && /^(?:질문|question)$/i.test(normalize(marker.getAttribute('title') ?? '')));
    if (label.length >= 4 && (questionMarker || interrogative.test(label)) && candidate.element.matches('a, button, [role~="button"]')
      && candidate.element.closest('li, tr, [role~="listitem"], [role~="row"]')) {
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
    const sourceLabel = normalize(candidate.label).replace(/[_-]+/g, ' ');
    const documentDownload = candidate.action === 'locate' && isDocumentDownload(candidate.element, candidate.label);
    // File names remain unchanged in Candidate/UI. Strip a known document
    // suffix only from this lexical view of an explicit download control.
    const label = documentDownload ? sourceLabel.replace(documentExtension, '').trim() : sourceLabel;
    if (orderingLabel.test(label)) return [];
    let url: URL | undefined;
    if (candidate.href) {
      try { url = new URL(candidate.href); } catch { return []; }
      if (!/^https?:$/.test(url.protocol)) return [];
    }
    const parts = url ? pathParts(url) : [];
    if (url && isDangerousURL(url, parts)) return [];
    const target = endpoint(parts);
    // Only a public academic information link may describe tuition payment.
    // Executable payment labels, controls, URLs and other dangerous words keep
    // the same rejection policy; source action/URL are never rewritten here.
    const academicInfo = academicInformation(candidate, label, target, url);
    if (dangerous.test(label) && !academicInfo) return [];
    // The safe candidate name is fixed metadata, never the input's current value.
    const searchControl = isSearchControl(candidate.element, label);
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
    if (academicInfo) return [{ ...candidate, category: 'academic' as const, score: 70, reasons: ['학사 납부 정보 읽기', '학사 제목과 안내 목적의 일반 링크'], pageTask: 'reading' as const }];
    const form = formReading(candidate, label, target, url);
    if (form === 'conflict') return [];
    if (form) return [{ ...candidate, category: 'apply' as const, score: 70, reasons: ['신청 준비 문서 읽기', form === 'document' ? '서식 목록과 명시적 문서명' : '발급·신청 절차의 명시적 서식 다운로드'], pageTask: 'reading' as const }];
    if (documentDownload && candidate.context !== 'footer') {
      if (issuanceIntent.test(label)) return [{ ...candidate, category: 'apply' as const, score: 70, reasons: ['발급 안내 문서 읽기', '명시적 다운로드와 발급 목적'], pageTask: 'reading' as const }];
      if (label.length <= 60 && (/(?:사용|이용)\s*안내$/.test(label) || legalDocument.test(label))) {
        return [{ ...candidate, category: 'help' as const, score: 70, reasons: ['안내·법령 문서 읽기', '명시적 문서 다운로드'], pageTask: 'reading' as const }];
      }
    }
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
      const textMatch = (rule.label.test(label) || rule.category === 'help' && (inquiry || contactHelp.test(label) || hoursHelp.test(label) || branchDirectory.test(label))
        || rule.category === 'apply' && issuanceIntent.test(label) || rule.category === 'notice' && publicNoticeList.test(label))
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
      const intent = textMatch && rule.category === 'help' ? 2 : textMatch && rule.category === 'apply' && (explicitApplication.test(label) || issuanceIntent.test(label)) ? 1 : 0;
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
    if ((!best || best.category === 'academic') && (academicReading(candidate, label, target, url) || academicLocalDestination(candidate, label, target, url))) {
      return [{ ...candidate, category: 'academic' as const, score: 70, reasons: ['학사 안내 문서 읽기', '학사 제목과 목록의 교육 개념·지침'], pageTask: 'reading' as const }];
    }
    const guideContext = contextsFor(candidate, label).some(value => value.length <= 60 && /안내$/.test(value));
    const formSubmit = candidate.element instanceof HTMLButtonElement && !!candidate.element.form && candidate.element.type === 'submit';
    if (!best && guideContext && candidate.context !== 'footer' && candidate.action === 'locate' && !formSubmit
      && candidate.element.matches('button, [role~="button"]') && /^(?:true|false)$/i.test(candidate.element.getAttribute('aria-expanded') ?? '')
      && !candidate.element.closest('article, [role~="article"]')) {
      return [{ ...candidate, category: 'help' as const, score: 60, reasons: ['안내 정보 패널 읽기', '안내 제목과 명시적 펼침 제어'], pageTask: 'control' as const }];
    }
    // A short public guide name is a fallback after specific task evidence.
    // Known task endpoints and document/article references cannot become help.
    if (!best && url && candidate.action === 'navigate' && candidate.element.matches('a[href]') && candidate.context !== 'footer'
      && label.length >= 4 && label.length <= 36 && /안내(?:\s*바로\s*가기)?$/.test(label) && !knownEndpoint
      && !hasDocumentReference(url) && !/^\d+(?:\.[a-z]+)?$/i.test(parts.at(-1) ?? '') && !candidate.element.closest('article, [role~="article"]')) {
      return [{ ...candidate, category: 'help' as const, score: 60, reasons: ['공개 안내 문서 읽기', '짧은 안내 목적의 일반 링크'], pageTask: undefined }];
    }
    return best && best.score >= 55 ? [best] : [];
  });
}
