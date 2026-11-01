import type { Candidate, Category } from './types';
import { collectionEvidence, supplementalEvidence, isInformationTopicLabel, isQuestionCollection, isSearchControl, isVisible, sourceSnapshot, type CollectionCache, type SupplementalCache } from './analyzer';
import { isDocumentDownload } from './action-policy';
import { institutionEvidence, type InstitutionEvidenceCache, type ClassificationMode } from './institution-evidence';
import { contentEvidence, type ContentEvidenceCache } from './content-evidence';
import { navigationUtility, createNavigationCache, type NavigationCache } from './navigation-utility';
import { relationEvidence, createRelationCache } from './relations';

export interface ClassificationOptions { mode?: ClassificationMode }

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
const preparationHeading = /^(?:(?:신청서|신고서|청구서|서식)\s*(?:및|[·/&])\s*)?(?:구비|제출|준비)\s*서류(?:\s*(?:목록|안내))?$/;
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
const counselingControl = /^(?:(?:무료|온라인|전화|방문|대면|비대면)\s*)?상담\s*(?:운영|안내)$/;
const applicationControlLabel = /^(?=.{2,36}$)[^.!?。？]{0,28}(?:신청|예약|접수)(?:\s*(?:(?:내역|결과|현황)\s*)?(?:확인|조회))?(?:\s*(?:하기|하러\s*가기|바로\s*가기))?$|^(?:apply(?:\s+now)?|reservations?|booking)$/i;
const issuanceServiceHeading = /^(?=.{2,48}$)(?:(?:온라인|인터넷|전자)\s*)?(?:(?:증명(?:서)?|민원|서류)\s*)?발급\s*(?:시스템|서비스)(?:\s*(?:바로\s*가기|목록))?$/;

function hasDangerousScript(element: HTMLElement): boolean {
  const raw = element.getAttribute('href')?.trim() ?? '';
  const script = [element.getAttribute('onclick') ?? '', /^javascript:/i.test(raw) ? raw : ''].join(' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return dangerous.test(script);
}

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
  const preparation = candidate.action === 'locate' && candidate.element.matches('a[href]') && listed
    && isDocumentDownload(candidate.element, candidate.label) && formTitle.test(label)
    && contexts.some(value => formsHeading.test(value) || preparationHeading.test(value));
  if (!document && !download && !preparation) return;
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

/** A plain http(s) link without a dangerous script or command URL. Used for
 * fixed site-wide controls (home, sign-up) that carry no task category. */
export function isSafeNavigation(candidate: Candidate): boolean {
  if (candidate.action !== 'navigate' || !candidate.href || !candidate.element.matches('a[href]') || hasDangerousScript(candidate.element)) return false;
  try {
    const url = new URL(candidate.href);
    return /^https?:$/.test(url.protocol) && !isDangerousURL(url, pathParts(url));
  } catch { return false; }
}

/** A real link or button that a page-type slot may show: no dangerous script,
 * no command URL, no dangerous visible name, never an editable control. */
export function isSafeSource(candidate: Candidate): boolean {
  if (!candidate.element.matches('a[href], button, [role~="button" i]') || hasDangerousScript(candidate.element)) return false;
  if (dangerous.test(normalize(candidate.label))) return false;
  return candidate.action !== 'navigate' || isSafeNavigation(candidate);
}

export function hasDocumentReference(url: URL): boolean {
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

function corroboratedArticleService(candidate: Candidate, label: string, target: string, parts: string[], url?: URL): boolean {
  if (!url || candidate.context !== 'body' || candidate.action !== 'navigate' || !candidate.element.matches('a[href]')
    || !candidate.element.closest('article, [role~="article"]') || hasDocumentReference(url)
    || parts.some(part => /^(?:news|articles?|stories|story|press)$/.test(part))) return false;
  // An article wrapper may contain a service card. A task-shaped fixed label
  // and the matching complete endpoint are both required; neither alone can
  // turn a news title or opaque document link into a service.
  return rules.some(rule => rule.endpoints.has(target)
    && (rule.category === 'apply' ? applicationControlLabel.test(label) : rule.section.test(label)));
}

function applicationPageControl(candidate: Candidate, label: string, target: string, url?: URL): boolean {
  if (candidate.context !== 'body' || !applicationControlLabel.test(label)
    || !candidate.element.matches('a[href], button, [role~="button"], input[type="button"], input[type="submit"]')
    || url && hasDocumentReference(url) || isDocumentDownload(candidate.element, candidate.label)
    || rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) return false;
  // A form's submission control is not an entry to a new application flow.
  return !((candidate.element instanceof HTMLButtonElement || candidate.element instanceof HTMLInputElement)
    && candidate.element.type === 'submit' && candidate.element.form);
}

function structuredContext(candidate: Candidate, label: string, collection: ReturnType<typeof collectionEvidence>, url?: URL, navigationCache?: NavigationCache): Candidate | undefined {
  const element = candidate.element;
  if (navigationUtility(element, label, navigationCache)) return;
  if (!collection.kind || candidate.context === 'footer' || !isInformationTopicLabel(label) || isDocumentDownload(element, candidate.label)
    || element.closest('header, footer, article, form, [role~="banner" i], [role~="contentinfo" i], [role~="article" i], [role~="form" i]')
    || (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && !!element.form) return;
  let destination = url;
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (!destination && raw && !/^(?:#|javascript:)/i.test(raw)) {
    try { const parsed = new URL(raw, document.baseURI); if (/^https?:$/.test(parsed.protocol)) destination = parsed; else return; }
    catch { return; }
  }
  // Only this new fallback examines fixed script metadata. It never executes
  // it, and a dangerous command remains ineligible when href is a locate action.
  if (hasDangerousScript(element)) return;
  const parts = destination ? pathParts(destination) : [];
  if (destination && (isDangerousURL(destination, parts) || hasDocumentReference(destination))
    || parts.some(part => /^(?:news|articles?|stories|story|press)$/.test(part))) return;
  const target = endpoint(parts);
  const contexts = contextsFor(candidate, label);
  if (contexts.some(heading => issuanceServiceHeading.test(heading)) && collection.kind === 'list'
    && (collection.controlled || !!destination)
    && !rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) {
    return { ...candidate, category: 'apply', score: 70, reasons: ['발급 서비스 진입', '명시적 발급 시스템 제목과 원본 목록 제어'], pageTask: 'control' };
  }
  const localReading = !!destination && destination.origin === location.origin && candidate.action === 'navigate';
  if (collection.peers >= 2 && (candidate.pagePurpose === 'help' || collection.informationPeer)
    && (collection.controlled || localReading)
    && !rules.some(rule => rule.category !== 'help' && rule.endpoints.has(target))) {
    return { ...candidate, category: 'help', score: 65, reasons: ['정보 주제 읽기', candidate.pagePurpose === 'help' ? '도움말·행동요령 목적과 원본 주제 목록' : '원본 목록·탭과 동료의 명시적 정보 개념'],
      pageTask: candidate.context === 'body' || candidate.action === 'locate' && collection.controlled ? 'reading' : undefined };
  }
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

function supplementalClassification(candidate: Candidate, label: string, target: string, supplementalCache: SupplementalCache, url?: URL, navigationCache?: NavigationCache): Candidate | undefined {
  const element = candidate.element;
  if (navigationUtility(element, label, navigationCache)) return;
  if (candidate.context !== 'body' || !element.matches('a[href], button, [role~="button" i]')
    || element.closest('article, [role~="article" i]')) return;
  // Inspect only the source's fixed structural metadata; original actions are
  // retained. In particular, search filters and downloads are never activated.
  const evidence = supplementalEvidence(element, supplementalCache);
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (hasDangerousScript(element)) return;
  let destination = url;
  if (!destination && raw && !/^(?:#|javascript:)/i.test(raw)) {
    try { destination = new URL(raw, document.baseURI); } catch { return; }
    if (!/^https?:$/.test(destination.protocol)) return;
  }
  if (destination && isDangerousURL(destination, pathParts(destination))) return;
  if (destination && pathParts(destination).some(part => /^(?:news|articles?|stories|story|press)$/.test(part))) return;
  if (destination) target = endpoint(pathParts(destination));
  const result = (category: Category, score: number, reason: string, task: NonNullable<Candidate['pageTask']>): Candidate => ({
    ...candidate, category, score, reasons: [reason, '고정 원본 제어 구조'], pageTask: task, supplementalDependent: true,
    relatedLabel: evidence.relatedLabel,
    snapshot: sourceSnapshot(element, candidate.label, undefined, false, true, supplementalCache, navigationCache),
  });
  if (!dangerous.test(label) && evidence.filter && isInformationTopicLabel(label)
    && !rules.some(rule => rule.category !== 'search' && rule.endpoints.has(target))) return result('search', 70, '검색 양식의 분야 필터', 'control');
  if (evidence.preparationAttachment && candidate.action === 'locate' && element.matches('a[href]')
    && !!evidence.relatedLabel && !dangerous.test(label) && !dangerous.test(evidence.relatedLabel)
    && !rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) {
    return result('apply', 70, '같은 서식 행의 고정 제목과 첨부 자료', 'reading');
  }
  const contexts = contextsFor(candidate, label);
  if (!dangerous.test(label) && evidence.materialRow && label.length >= 2 && label.length <= 60
    && !rules.some(rule => !['apply', 'academic'].includes(rule.category) && rule.label.test(label))
    && contexts.some(text => /^(?=.{2,40}$).*(?:민원|신청|신고).*(?:편람|서식|준비\s*자료)$/.test(text))
    && !rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) return result('apply', 70, '신청 준비 편람의 원본 서식 자료', 'reading');
  // A broad guide relationship must not replace a more specific, established
  // page control or issuance-preparation intent. Let those existing branches
  // classify the original label and retain their own action/safety checks.
  if (contextualReading(candidate, label)?.category === 'academic'
    || issuanceIntent.test(label) && contexts.some(text => procedureHeading.test(text))) return;
  const guideContext = contexts.some(text => text.length <= 60 && /안내$/.test(text));
  const readingContexts = [...contexts, ...evidence.associatedHeadings];
  const guideReading = candidate.pagePurpose === 'help' || readingContexts.some(text => text.length <= 60
    && (/(?:안내|설명서|도움말|사용\s*법|이용\s*법|가이드|요령|수칙|매뉴얼|\b(?:instructions?|guide|manual|help))$/i.test(text)
      || /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|download)$/i.test(text)));
  const academicPeer = (peer: typeof evidence.collectionPeers[number]): boolean => {
    if (!peer.isLink || peer.action !== 'navigate' || !peer.href || !isInformationTopicLabel(peer.label)
      || !academicConcept.test(peer.label) || !academicGuideEnd.test(peer.label) || dangerous.test(peer.label)) return false;
    try {
      const destination = new URL(peer.href);
      const peerParts = pathParts(destination);
      return /^https?:$/.test(destination.protocol) && destination.origin === location.origin
        && !isDangerousURL(destination, peerParts) && !hasDocumentReference(destination)
        && !peerParts.some(part => /^(?:news|articles?|stories|story|press)$/.test(part))
        && !rules.some(rule => rule.category !== 'academic' && rule.endpoints.has(endpoint(peerParts)));
    } catch { return false; }
  };
  const educationPeers = evidence.collectionPeers.filter(academicPeer);
  if (candidate.action === 'navigate' && academicPeer({ label: candidate.label, action: candidate.action, href: candidate.href, isLink: element.matches('a[href]') })
    && educationPeers.length >= 2 && educationPeers.length > evidence.collectionPeers.length / 2) {
    return candidate.pagePurpose === 'help'
      ? result('help', 70, '명시적 도움말 목적과 원본 교육 개념 목록', 'reading')
      : result('academic', 70, '같은 출처 읽기 링크와 다수의 고정 교육 개념', 'reading');
  }
  const readingTopic = evidence.topicPeers >= 2 && (evidence.controlledTopic || evidence.associatedHeadings.length > 0)
    && !(destination && hasDocumentReference(destination));
  const competingTask = rules.some(rule => rule.category !== 'help' && rule.label.test(label)
    && !(rule.category === 'search' && searchGuidanceLabel.test(label)));
  const readingSubject = evidence.linkedTopic || /(?:결과|기능|조건|절차|방법|안내|단계|항목|구성|개요)$/.test(label);
  const academicTopic = !dangerous.test(label) && readingTopic && academicConcept.test(label) && !explicitApplication.test(label)
    && readingContexts.some(text => text.length <= 60 && /학사|학적|교육\s*과정|학위|이수|전공|교양|졸업/.test(text))
    && !rules.some(rule => rule.category !== 'academic' && rule.endpoints.has(target));
  // Education concepts describe an academic reading task unless the source
  // explicitly identifies this as a help/FAQ/instructions page.
  if (academicTopic && candidate.pagePurpose !== 'help') return result('academic', 70, '원본 교육 개념과 연결된 내용 제목', 'reading');
  if (!dangerous.test(label) && readingTopic && isInformationTopicLabel(label) && !isSearchControl(element, candidate.label)
    && !element.closest('form, [role~="form" i]') && !isDocumentDownload(element, candidate.label)
    && (!competingTask || readingSubject) && !rules.some(rule => rule.category !== 'help' && rule.endpoints.has(target)) && guideReading) {
    return result('help', 70, '원본 안내 주제와 연결된 읽기 제어', 'reading');
  }
  if (academicTopic) {
    return result('academic', 70, '원본 교육 개념과 연결된 내용 제목', 'reading');
  }
  if (!dangerous.test(label) && guideReading && candidate.action === 'locate' && label.length <= 60
    && element.matches('button, [role~="button" i]') && !element.closest('form, [role~="form" i]')
    && /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|받기|download)$/i.test(label)) {
    return result('help', 70, '안내 문맥의 명시적 가이드 자료 제어', 'reading');
  }
  if (!dangerous.test(label) && isInformationTopicLabel(label) && candidate.action === 'locate'
    && (evidence.informationPanels || guideContext && evidence.grouped)
    && !rules.some(rule => rule.category !== 'help' && rule.label.test(label) && !(rule.category === 'search' && searchGuidanceLabel.test(label)))
    && !isDocumentDownload(element, candidate.label)
    && !rules.some(rule => rule.category !== 'help' && rule.endpoints.has(target))) return result('help', 65, '공개 정보 패널·안내 주제 읽기', 'reading');
  const title = evidence.title;
  if (!title || dangerous.test(title.replace(/납부(?=\s*(?:내역|기록))/, '')) || isDocumentDownload(element, candidate.label)
    || destination && hasDocumentReference(destination) || element.closest('form, [role~="form" i]')) return;
  if (/^(?=.{2,36}$).*(?:모의\s*계산|간단\s*계산|simulation|calculator)$/i.test(title)
    && !dangerous.test(label)
    && !rules.some(rule => rule.category !== 'search' && rule.endpoints.has(target))) return result('search', 70, '명시적 모의·간단 계산 카드', 'control');
  // A readonly own-record title is distinct from a payment command. Only the
  // fixed title may carry 납부내역; descriptions cannot create this exception.
  if (/^(?=.{2,36}$).*(?:내역|기록)\s*(?:조회|확인)(?:하기)?$/.test(title)
    && !dangerous.test(label.replace(/납부(?=\s*(?:내역|기록))/g, ''))
    && !rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) return result('apply', 70, '개인 내역·기록 확인 카드', 'control');
  if (!dangerous.test(label) && (applicationControlLabel.test(title) || explicitApplication.test(title) || /^(?=.{2,36}$).*(?:급여|급부|지원금)\s*청구$/.test(title))
    && !rules.some(rule => rule.category !== 'apply' && rule.endpoints.has(target))) return result('apply', 70, '명시적 신청·청구 카드 제목', 'control');
}

function readonlyHelpDocument(candidate: Candidate, label: string, target: string, url?: URL): Candidate | undefined {
  if (!url || candidate.context !== 'body' || candidate.action !== 'navigate' || !candidate.element.matches('a[href]')
    || !candidate.element.closest('li, tr, [role~="listitem"], [role~="row"]') || candidate.element.closest('article, [role~="article"]')
    || !hasDocumentReference(url) || candidate.pagePurpose !== 'help' || label.length < 4 || label.length > 100
    || pathParts(url).some(part => /^(?:news|articles?|stories|story|press)$/.test(part))
    || !(/(?:안내|방법|절차)$/.test(label) || interrogative.test(label))
    || rules.some(rule => rule.category !== 'help' && rule.endpoints.has(target))) return;
  return { ...candidate, category: 'help', score: 72, reasons: ['도움말 안내 문서 읽기', '도움말 목적과 목록의 명시적 읽기 문서'], pageTask: 'reading' };
}

export function classify(candidates: Candidate[], options: ClassificationOptions = {}): Candidate[] {
  const mode = options.mode ?? 'institution';
  const collectionCache: CollectionCache = new WeakMap();
  const supplementalCache: SupplementalCache = new WeakMap();
  const contentCache: ContentEvidenceCache = new WeakMap();
  const institutionCache: InstitutionEvidenceCache = new WeakMap();
  const navigationCache = createNavigationCache();
  const relationCache = createRelationCache();
  const classified = candidates.flatMap<Candidate>(candidate => {
    // Machine-authored accessible names can separate words with _ or -. This
    // lexical view does not alter source labels, URL paths or action metadata.
    const sourceLabel = normalize(candidate.label).replace(/[_-]+/g, ' ');
    const documentDownload = candidate.action === 'locate' && isDocumentDownload(candidate.element, candidate.label);
    // File names remain unchanged in Candidate/UI. Strip a known document
    // suffix only from this lexical view of an explicit download control.
    const label = documentDownload ? sourceLabel.replace(documentExtension, '').trim() : sourceLabel;
    const utility = navigationUtility(candidate.element, candidate.label, navigationCache);
    if (utility === 'position') return [];
    if (orderingLabel.test(label)) return [];
    // Reject an explicit dangerous command before any lexical fallback can
    // revive a source that a structural reading branch has already rejected.
    // This inspects fixed attributes only and never executes source scripts.
    if (hasDangerousScript(candidate.element)) return [];
    let url: URL | undefined;
    if (candidate.href) {
      try { url = new URL(candidate.href); } catch { return []; }
      if (!/^https?:$/.test(url.protocol)) return [];
    }
    const parts = url ? pathParts(url) : [];
    if (url && isDangerousURL(url, parts)) return [];
    let inspectionURL = url;
    if (!url) {
      // A locate action intentionally omits href from Candidate, but an
      // explicit source HTTP command is still safety evidence. Read only the
      // fixed destination metadata, without promoting it to navigation.
      const raw = candidate.element.getAttribute('href')?.trim() ?? '';
      if (raw && !/^(?:#|javascript:)/i.test(raw)) {
        try {
          const sourceURL = new URL(raw, document.baseURI);
          if (/^https?:$/.test(sourceURL.protocol)) {
            if (isDangerousURL(sourceURL, pathParts(sourceURL))) return [];
            inspectionURL = sourceURL;
          }
        } catch { /* An unresolved source stays a locate action. */ }
      }
    }
    const target = endpoint(parts);
    // Verified reading metadata can describe payment/history topics. The URL
    // command guard runs first; the narrow reading/card branches retain the
    // source action and cannot execute a payment, delete, or final submission.
    const academicInfo = academicInformation(candidate, label, target, url);
    // Institution evidence cannot revive unsafe source commands, private input,
    // form submission or an unrelated article. It supplies semantics only;
    // source action/href/target and the ordinary-link policy remain untouched.
    const element = candidate.element;
    if (mode === 'institution' && candidate.context !== 'footer' && isVisible(element)
      && element.matches('a[href], button, [role~="button" i], [role~="tab" i]')
      && !element.closest('form, [role~="form" i], input, textarea, select, [contenteditable]:not([contenteditable="false" i]), [role~="textbox" i], [role~="searchbox" i], [role~="combobox" i], [role~="spinbutton" i], [role~="slider" i]')
      && !(element instanceof HTMLButtonElement && element.form)) {
      const inspectionParts = inspectionURL ? pathParts(inspectionURL) : [];
      const inspectionTarget = endpoint(inspectionParts);
      const notice = noticeDocumentEvidence(candidate, label, normalize(candidate.sectionLabel ?? ''), inspectionTarget, inspectionURL);
      const supportedAnchor = !(element instanceof HTMLAnchorElement)
        || !!inspectionURL || (element.getAttribute('href') ?? '').trim().startsWith('#');
      const article = !!element.closest('article, [role~="article" i]') || isArticle(candidate, inspectionParts, inspectionURL);
      if (supportedAnchor && notice !== 'conflict' && (!article || !!notice || corroboratedArticleService(candidate, label, inspectionTarget, inspectionParts, inspectionURL))) {
        const evidence = institutionEvidence(candidate, institutionCache);
        const conflict = evidence && rules.some(rule => rule.category !== evidence.category && rule.endpoints.has(inspectionTarget));
        // A payment deadline is information only when the source actually
        // controls a unique noninteractive local explanation panel. This never
        // waives the URL/script guards or permits payment/submit controls.
        const readonlyDeadline = evidence?.readonlyPanel === true && evidence.contentScope === 'content'
          && evidence.category === 'help' && evidence.pageTask === 'reading'
          && candidate.action === 'locate' && element instanceof HTMLAnchorElement
          && /^#[^\s]+$/.test(element.getAttribute('href')?.trim() ?? '')
          && /^(?=.{2,60}$).*(?:납부\s*(?:기한|기간|일정)|\bpayment\s+(?:deadline|period|schedule))$/i.test(label)
          && !dangerous.test(label.replace(/납부|\bpayment\b/gi, ''));
        if (evidence && !conflict && (!dangerous.test(label) || readonlyDeadline)) return [{ ...candidate, category: evidence.category, score: evidence.score,
          pageTask: evidence.pageTask, institutionEvidence: evidence,
          reasons: ['원본 메뉴와 안내 내용의 관계', '기관 페이지의 명시적 읽기 목적'] }];
      }
    }
    // Independently named controls may share a verified local task/list/table
    // relationship. Common unsafe-command checks have already run. This branch
    // never changes a source name, action, href, target or an actual form submit.
    if (!dangerous.test(label) && candidate.context === 'body' && isVisible(element)
      && element.matches('a[href],button,[role~="button" i],[role~="tab" i]')
      && !element.closest('form,[role~="form" i],article,[role~="article" i],input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]')
      && !(element instanceof HTMLButtonElement && element.form)) {
      const relationTarget = inspectionURL ? endpoint(pathParts(inspectionURL)) : target;
      const relation = relationEvidence(candidate, relationCache);
      if (relation && !rules.some(rule => rule.category !== relation.category && rule.endpoints.has(relationTarget))
        && !noticeDocumentEvidence(candidate, label, normalize(candidate.sectionLabel ?? ''), relationTarget, inspectionURL)) {
        return [{ ...candidate, relationEvidence: relation, category: relation.category, score: relation.score,
          pageTask: relation.pageTask, relatedLabel: relation.relatedLabel,
          reasons: ['고정 원본 제어와 같은 본문의 관계', '실제 목록·표·서비스 항목의 명시적 역할'] }];
      }
    }
    const readonlyHelp = readonlyHelpDocument(candidate, label, target, url);
    if (readonlyHelp) return [readonlyHelp];
    const supplemental = supplementalClassification(candidate, label, target, supplementalCache, url, navigationCache);
    if (supplemental) return [supplemental];
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
    if (isArticle(candidate, parts, url) && !corroboratedArticleService(candidate, label, target, parts, url)) return [];
    if (academicInfo) return [{ ...candidate, category: 'academic' as const, score: 70, reasons: ['학사 납부 정보 읽기', '학사 제목과 안내 목적의 일반 링크'], pageTask: 'reading' as const }];
    const form = formReading(candidate, label, inspectionURL ? endpoint(pathParts(inspectionURL)) : target, url);
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
          ? semanticMatch || rule.category === 'apply' && applicationPageControl(candidate, label, target, url)
            || rule.category === 'help' && (viewerControl.test(label)
            || candidate.element.matches('a[href], button, [role~="button"]')
              && (contactHelp.test(label) || hoursHelp.test(label) || branchDirectory.test(label) || counselingControl.test(label))) ? 'control'
            : sectionMatch || rule.category === 'notice' && noticeCollection.test(label) ? 'collection' : undefined
          : undefined;
        best = { ...candidate, category: rule.category, score, reasons, pageTask };
        bestIntent = intent;
      }
    }
    if (!best) {
      const structured = structuredContext(candidate, label, collectionEvidence(candidate.element, collectionCache), url, navigationCache);
      if (structured) return [{ ...structured, collectionDependent: true,
        snapshot: sourceSnapshot(candidate.element, candidate.label, collectionCache, true, false, undefined, navigationCache) }];
    }
    if ((!best || best.category === 'academic') && (academicReading(candidate, label, target, url) || academicLocalDestination(candidate, label, target, url))) {
      return [{ ...candidate, category: 'academic' as const, score: 70, reasons: ['학사 안내 문서 읽기', '학사 제목과 목록의 교육 개념·지침'], pageTask: 'reading' as const }];
    }
    const guideContext = contextsFor(candidate, label).some(value => value.length <= 60 && /안내$/.test(value));
    const formSubmit = candidate.element instanceof HTMLButtonElement && !!candidate.element.form && candidate.element.type === 'submit';
    if (!best && !utility && guideContext && isInformationTopicLabel(label) && candidate.context !== 'footer' && candidate.action === 'locate' && !formSubmit
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
  return classified.map(candidate => {
    const evidence = contentEvidence(candidate, contentCache, supplementalCache);
    return evidence ? { ...candidate, contentEvidence: evidence } : candidate;
  });
}
