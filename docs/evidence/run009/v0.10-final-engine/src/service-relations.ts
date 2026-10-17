import { candidateLabel, isVisible } from './analyzer';
import { evidenceNodes } from './evidence-nodes';
import type { Candidate, Category, RelationEvidence } from './types';

// The caller may pass a fresh WeakMap for one analysis/currentness batch only.
// Relationships are re-established on every call; this module retains no cache.
export type ServiceRelationCache = WeakMap<Element, unknown>;
const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const excluded = 'header,footer,nav,aside,article,form,[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i],[role~="complementary" i],[role~="article" i],[role~="form" i]';
const controls = 'a[href],button,[role~="button" i],[role~="tab" i]';
const headings = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
const fixedTitles = `${headings},strong`;
const danger = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;
const commandKey = /^(?:action|cmd|command|mode|task|event|method|operation|do)$/i;
const riskKey = /^(?:logout|signout|delete|remove|payment|checkout|final_submit)$/i;
const details = /^(?:상세\s*보기|자세히\s*보기|세부\s*정보|details?)$/i;
const issue = /^(?:발급(?:\s*(?:하기|신청))?|신청(?:\s*하기)?|예약(?:\s*하기)?|접수(?:\s*하기)?)$/;
const preview = /^(?:미리\s*보기|견본\s*보기|preview)$/i;
const mediaView = /^(?:(?:센터|기관|활동|현장)\s*)?(?:소식|사진(?:\s*자료)?|영상(?:\s*자료)?|동영상(?:\s*자료)?|news|photos?|videos?)$/i;
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const compact = (value: string) => normalize(value).replace(/\s+/g, '');
function name(element: HTMLElement): string { return normalize(candidateLabel(element)); }
function decoded(value: string): string {
  for (let i = 0; i < 2; i++) { try { const next = decodeURIComponent(value); if (next === value) break; value = next; } catch { break; } }
  return value;
}
function unsafeScript(value: string): boolean {
  const text = decoded(value);
  return danger.test(text) || /(?:delete|remove|logout|signout|pay|purchase|submit)(?:[A-Z][\w$]*)?\s*\(/.test(text);
}
function safeURL(element: HTMLElement): boolean {
  const raw = element.getAttribute('href');
  if (!raw) return !element.matches('a');
  if (/^javascript:/i.test(raw.trim())) return !unsafeScript(raw);
  try {
    const url = new URL(raw, document.baseURI);
    if (!/^https?:$/.test(url.protocol)) return false;
    if (url.pathname.split('/').some(part => danger.test(decoded(part).replace(/[_.-]/g, ' ')))) return false;
    for (const [key, value] of url.searchParams) if (riskKey.test(key)
      || commandKey.test(key) && (danger.test(decoded(value)) || /^submit$/i.test(decoded(value)))) return false;
    return true;
  } catch { return false; }
}
function safeControl(element: HTMLElement): boolean {
  if (!isVisible(element) || element.closest(`${excluded},${editable}`) || element.querySelector(editable)
    || element.matches('[aria-expanded],[aria-haspopup],[aria-controls]') || element instanceof HTMLButtonElement && !!element.form) return false;
  const label = name(element);
  return !!label && !danger.test(label) && !danger.test(element.getAttribute('title') ?? '') && safeURL(element)
    && [...element.attributes].filter(attribute => /^on/i.test(attribute.name)).every(attribute => !unsafeScript(attribute.value));
}
function fixedName(element: HTMLElement): string {
  if (!element.matches(fixedTitles) || element.closest(`${excluded},${editable},${controls}`)
    || element.querySelector(`${editable},${controls}`) || element.hasAttribute('aria-labelledby')) return '';
  const label = name(element);
  return label.length >= 2 && label.length <= 80 && !danger.test(label) ? label : '';
}
// Bounded structural traversal never reads whole-region text, live values, or
// editable subtrees. A bound failure abandons the new relationship.
function scan(root: HTMLElement, selector: string, limit = 160, prune = excluded): HTMLElement[] | undefined {
  const pending = [...root.children].reverse();
  const matches: HTMLElement[] = [];
  let visited = 0;
  while (pending.length) {
    const element = pending.pop()!;
    if (++visited > limit) return;
    if (!(element instanceof HTMLElement) || element.matches(`script,style,template,noscript,${prune}`)) continue;
    if (element.matches(selector)) matches.push(element);
    if (element.matches(editable)) continue;
    pending.push(...[...element.children].reverse());
  }
  return matches;
}
function currentDocument(element: HTMLElement): boolean {
  const raw = element.getAttribute('href');
  if (!raw || !safeURL(element)) return false;
  try { const url = new URL(raw, document.baseURI); return /^https?:$/.test(url.protocol)
    && url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !url.hash;
  } catch { return false; }
}
function selected(element: HTMLElement): boolean {
  return [element, element.parentElement].some(node => !!node && (/^(?:page|true)$/i.test(node.getAttribute('aria-current') ?? '')
    || /^true$/i.test(node.getAttribute('aria-selected') ?? '')
    || /(?:^|\s)(?:active|selected|current|on|is-active)(?:\s|$)/i.test(node.getAttribute('class') ?? '')));
}
function evidence(candidate: Candidate, rule: string, category: Category, pageTask: 'reading' | 'control',
  dependencies: HTMLElement[], titles: HTMLElement[], relatedLabel: string): RelationEvidence | undefined {
  const nodes = evidenceNodes([candidate.element, ...dependencies], titles);
  if (!nodes) return;
  return { rule, category, score:70, pageTask, contentScope:'content', relatedLabel, dependencies:nodes,
    // Source snapshots own complete action/href/target checks. Opaque queries
    // and original scripts are never serialized into this semantic proof.
    fingerprint:JSON.stringify([rule, category, pageTask, candidate.label, candidate.action, relatedLabel,
      location.origin, location.pathname, nodes.map(node => [node.tagName,
        ...['class','role','aria-selected','aria-current','aria-expanded','aria-hidden','hidden','title'].map(key => node.getAttribute(key)),
        node instanceof HTMLElement && titles.includes(node) ? fixedName(node)
          : node instanceof HTMLElement && node.matches(controls) ? name(node) : '',
        node instanceof HTMLElement && node.matches('a[href]') ? currentDocument(node) : null])]),
  };
}
function localTask(candidate: Candidate): RelationEvidence | undefined {
  const own = /^(?:나의|내|본인|my)\s*(.+?)(?:\s*(?:보기|조회|현황|내역|상태))$/i;
  const publicReading = /^(.+?)\s*공개(?:\s*(?:목록|내역))?$/;
  const taskTitle = /^(.{2,28}?)\s*(?:신청|예약|접수)(?:\s*하기)?$/;
  const ownName = name(candidate.element);
  if (!own.test(ownName) && !publicReading.test(ownName) && !/(?:신청|예약|접수)/.test(ownName)) return;
  for (let root = candidate.element.parentElement, depth = 0; root && depth < 7; root = root.parentElement, depth++) {
    if (root.matches(`html,body,${excluded},${editable}`)) break;
    const lists = scan(root, 'ul,ol,[role~="tablist" i]', 120);
    if (!lists) continue;
    for (const list of lists) {
      if (list.childElementCount < 2 || list.childElementCount > 6 || list.querySelector(editable)) continue;
      const peers = scan(list, controls, 40);
      if (!peers || peers.length !== list.childElementCount || !peers.every(safeControl)) continue;
      const chosen = peers.filter(selected);
      if (chosen.length !== 1 || !currentDocument(chosen[0])) continue;
      const title = name(chosen[0]);
      const task = title.match(taskTitle);
      if (!task) continue;
      const subject = compact(task[1]);
      if (subject.length < 2) continue;
      // Every tab must describe its own role in the same task. A mixed list is
      // ambiguous even when the individual candidate happens to look useful.
      const role = (peer: HTMLElement): Category | undefined => {
        const label = name(peer);
        if (peer === chosen[0] && compact(label) === compact(title)) return 'apply';
        const privateView = label.match(own); if (privateView && compact(privateView[1]) === subject) return 'apply';
        const published = label.match(publicReading); if (published && compact(published[1]) === subject) return 'help';
      };
      if (peers.some(peer => !role(peer))) continue;
      const titles = scan(root, fixedTitles, 120);
      if (!titles) continue;
      const matches = titles.filter(node => fixedName(node) === title
        && !!(list.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
      // A heading from a neighbouring semantic section cannot name this list.
      const heading = matches.length === 1 ? matches[0] : undefined;
      if (!heading) continue;
      const listRegion = list.closest('section,[role~="region" i]');
      if (heading.closest('section,[role~="region" i]') !== listRegion) continue;
      let category = peers.includes(candidate.element) ? role(candidate.element) : undefined;
      if (!category) {
        const entry = compact(ownName).replace(/\([^)]*\)/g, '').replace(/바로가기$/, '');
        if (!peers.includes(candidate.element) && entry === compact(title)
          && !!(heading.compareDocumentPosition(candidate.element) & Node.DOCUMENT_POSITION_FOLLOWING)) category = 'apply';
      }
      if (category) return evidence(candidate, 'current-local-task-roles', category, category === 'help' ? 'reading' : 'control',
        [root,list,...peers,heading,...peers.map(peer => peer.parentElement!)], [heading], title);
    }
  }
}
function supportView(candidate: Candidate): RelationEvidence | undefined {
  if (!mediaView.test(name(candidate.element).replace(/\s*선택됨$/, ''))) return;
  const group = candidate.element.parentElement;
  if (!group || group.childElementCount < 2 || group.childElementCount > 6 || group.querySelector(editable)) return;
  const peers = [...group.children];
  if (!peers.every((peer): peer is HTMLElement => peer instanceof HTMLElement && peer.matches(controls)
    && safeControl(peer) && mediaView.test(name(peer).replace(/\s*선택됨$/, '')))) return;
  const owner = group.parentElement;
  const previous = group.previousElementSibling;
  const content = group.nextElementSibling;
  if (!owner || !previous || !(previous instanceof HTMLElement) || !(content instanceof HTMLElement)
    || previous.matches(`section,${excluded},${editable}`) || content.matches(`${excluded},${editable}`)) return;
  const titles = previous.matches(headings) ? [previous] : scan(previous, headings, 60);
  const title = titles?.filter(node => /(?:지원|상담)\s*센터|상담소|support\s*(?:center|centre)/i.test(fixedName(node)));
  if (title?.length !== 1) return;
  const tables = scan(content, 'table', 350);
  if (!tables || tables.length !== 1) return;
  const table = tables[0];
  const cells = [...table.querySelectorAll<HTMLElement>('thead th')];
  const titleCells = cells.filter(node => !node.querySelector(`${editable},${controls}`) && /^(?:제목|자료명|title)$/i.test(name(node)));
  const rows = [...table.querySelectorAll<HTMLElement>('tbody tr')];
  if (titleCells.length !== 1 || rows.length < 1 || rows.length > 30 || table.querySelector(editable)) return;
  const links = rows.flatMap(row => [...row.querySelectorAll<HTMLElement>('a[href]')]);
  if (!links.length || links.length > 30 || !links.every(safeControl)) return;
  return evidence(candidate, 'support-content-reading-views', 'help', 'reading',
    [owner,group,previous,content,title[0],table,...cells,...rows,...peers,...links], [title[0],...titleCells], fixedName(title[0]));
}
function serviceCard(candidate: Candidate): RelationEvidence | undefined {
  const label = name(candidate.element);
  if (!details.test(label) && !issue.test(label) && !preview.test(label)) return;
  const card = candidate.element.closest<HTMLElement>('li,[role~="listitem" i],section,[role~="group" i]');
  if (!card || card.closest(`${excluded},${editable}`) || card.querySelector(`${editable},form,[role~="form" i]`)) return;
  const nodes = scan(card, `${controls},${fixedTitles}`, 100);
  if (!nodes) return;
  const peers = nodes.filter(node => node.matches(controls));
  const titles = nodes.filter(node => node.matches(fixedTitles) && !!fixedName(node));
  if (peers.length !== 3 || titles.length !== 1 || !peers.includes(candidate.element) || !peers.every(safeControl)) return;
  const title = titles[0];
  const topic = fixedName(title);
  if (!/증명|확인서|영수증|내역서|certificate|statement|receipt|record/i.test(topic)
    || !(title.compareDocumentPosition(peers[0]) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
  if (peers.filter(peer => details.test(name(peer))).length !== 1 || peers.filter(peer => issue.test(name(peer))).length !== 1
    || peers.filter(peer => preview.test(name(peer))).length !== 1) return;
  // A control's explicit contextual title may corroborate this card, but may
  // not silently point at a different service with the same generic own label.
  if (peers.some(peer => {
    const metadata = normalize(peer.getAttribute('title') ?? '').replace(/^\(?(?:새창열림|새\s*창|new\s*window)\)?\s*/i, '');
    return !!metadata && metadata !== name(peer) && metadata !== `${topic} ${name(peer)}`;
  })) return;
  const category: Category = issue.test(label) ? 'apply' : 'help';
  return evidence(candidate, 'single-service-own-actions', category, category === 'apply' ? 'control' : 'reading',
    [card,title,...peers], [title], topic);
}
export function serviceRelation(candidate: Candidate, _cache?: ServiceRelationCache): RelationEvidence | undefined {
  const element = candidate.element;
  if (candidate.context === 'footer' || !element.matches(controls) || !safeControl(element)
    || candidateLabel(element) !== candidate.label) return;
  return serviceCard(candidate) ?? supportView(candidate) ?? localTask(candidate);
}
