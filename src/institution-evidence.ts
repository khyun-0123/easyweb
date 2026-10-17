import { candidateLabel, getSafeLabel, isVisible } from './analyzer';
import type { Candidate, Category, InstitutionEvidence } from './types';
import { evidenceNodes } from './evidence-nodes';

export type { InstitutionEvidence } from './types';
export type ClassificationMode = 'generic' | 'institution';
export const ADAPTER_VERSION = 3;
export type InstitutionEvidenceCache = WeakMap<Element, unknown>;

const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const excluded = 'header,footer,article,aside,form,[role~="banner" i],[role~="contentinfo" i],[role~="article" i],[role~="complementary" i],[role~="form" i]';
const headingSelector = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const serviceEntry = /신청|예약|접수|발급|조회|로그인|인증|제출|청구/;

function fixedName(element: HTMLElement): string {
  if (element.closest(`${editable},${excluded}`)) return '';
  return normalize(candidateLabel(element));
}

// Only editorial heading names are read, including an inactive tab's heading.
// getSafeLabel skips editable descendants; no body text or live values are read.
function headingName(element: HTMLElement, hidden = false): string {
  if (!element.matches(headingSelector) || element.closest(editable)
    || element.hasAttribute('aria-labelledby')) return '';
  const name = normalize(hidden ? getSafeLabel(element) : candidateLabel(element));
  return name.length >= 2 && name.length <= 100 ? name : '';
}

function headings(container: HTMLElement, hidden = false): HTMLElement[] {
  const nodes = [...container.querySelectorAll<HTMLElement>(headingSelector)];
  if (nodes.length > 40) return [];
  return nodes.filter(node => !node.closest(excluded) && !!headingName(node, hidden));
}

function sourceURL(element: HTMLElement): URL | undefined {
  const raw = element.getAttribute('href');
  if (!raw) return;
  try {
    const url = new URL(raw, document.baseURI);
    if (url.origin === location.origin) return url;
  } catch { /* Unresolved metadata is not an institutional relationship. */ }
}

function linkStructure(element: HTMLElement): readonly string[] | null {
  if (!element.matches('a[href]')) return null;
  try {
    const url = new URL(element.getAttribute('href') ?? '', document.baseURI);
    // Opaque query values are neither semantic rules nor diagnostic payload.
    return /^https?:$/.test(url.protocol) ? [url.origin, url.pathname, url.hash] : [url.protocol];
  } catch { return ['unresolved']; }
}

function evidence(candidate: Candidate, adapter: string, rule: string, category: Category,
  dependencies: HTMLElement[], score: 65 | 70 = 70,
  facts: { pageTask?: 'reading' | 'control'; readonlyPanel?: true; contentScope?: 'content' | 'navigation'; tokens?: readonly string[] } = {}): InstitutionEvidence | undefined {
  const unique = evidenceNodes([candidate.element, ...dependencies], dependencies.filter(node => node.matches('.s_tit,p')));
  if (!unique) return;
  return {
    adapter, version: ADAPTER_VERSION, rule, category, score, pageTask: facts.pageTask ?? 'reading', dependencies: unique,
    ...(facts.readonlyPanel ? { readonlyPanel: true as const } : {}),
    ...(facts.contentScope ? { contentScope: facts.contentScope } : {}),
    // Raw URL queries, original scripts, input values and whole-region text are
    // deliberately absent. The generic source snapshot owns action/href checks.
    fingerprint: JSON.stringify([ADAPTER_VERSION, adapter, rule, location.origin, location.pathname,
      candidate.label, candidate.action, category, facts.pageTask ?? 'reading', !!facts.readonlyPanel, facts.contentScope ?? '', facts.tokens ?? [], unique.map(node => [node.tagName,
        ...['id', 'class', 'role', 'aria-controls', 'aria-expanded', 'aria-hidden', 'hidden'].map(name => node.getAttribute(name)),
        node instanceof HTMLElement ? linkStructure(node) : null,
        node instanceof HTMLElement && node.matches(headingSelector) ? headingName(node, true) : node instanceof HTMLElement && node.matches('a[href],button,.s_tit') ? fixedName(node) : '',
      ])]),
  };
}

function education(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  if (serviceEntry.test(name)) return;
  const element = candidate.element;
  const root = element.closest<HTMLElement>('#contents');
  if (!root) return;
  const titles = headings(root).filter(node => /교육|훈련/.test(headingName(node)));
  if (!titles.length) return;
  // An institution's local education menu supplies the reading context; an
  // arbitrary link elsewhere on the page does not inherit it.
  const menu = element.closest<HTMLElement>('#lnbmenu');
  if (menu && element.matches('a[href]') && element.closest('li')
    && /(?:교육|훈련)/.test(name) && /(?:개요|계획|자료|안내|소개)$/.test(name)) {
    const destination = sourceURL(element);
    if (destination && /^(?:\/safekorea-kor\/edtr\/|\/safekorea-kor\/cmmn\/bbs\/)/.test(destination.pathname)) {
      return evidence(candidate, 'safekorea-education', 'local-reading-menu', 'help', [root, menu, ...titles], 65, { contentScope: 'navigation' });
    }
  }
  const tabs = element.closest<HTMLElement>('.tab-area');
  if (!tabs || element.parentElement !== tabs || !element.matches('button.tab-list')
    || !/^(?:true|false)$/i.test(element.getAttribute('aria-expanded') ?? '')
    || !/(?:교육|훈련)/.test(name) || !/(?:개요|개념|안내|소개)$/.test(name)) return;
  const peers = [...tabs.children].filter((node): node is HTMLElement => node instanceof HTMLElement
    && node.matches('button.tab-list[aria-expanded]') && !!candidateLabel(node));
  if (peers.length < 2 || peers.length > 8 || !peers.includes(element)
    || peers.some(peer => !/^(?:true|false)$/i.test(peer.getAttribute('aria-expanded') ?? ''))) return;
  const panels = peers.map(peer => peer.nextElementSibling);
  if (panels.some(panel => !(panel instanceof HTMLElement) || !panel.matches('div.tab-content')
    || !!panel.closest(editable))) return;
  const panel = element.nextElementSibling as HTMLElement;
  const panelHeadings = headings(panel, true);
  if (!panelHeadings.length) return;
  return evidence(candidate, 'safekorea-education', 'local-overview-panels', 'help',
    [root, tabs, ...titles, ...peers, ...panels as HTMLElement[], ...panelHeadings], 70, { contentScope: 'content' });
}

function pension(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  const element = candidate.element;
  if (!element.matches('a[href]') || serviceEntry.test(name)
    || /(?:납부|결제|지급|환급|삭제|탈퇴)(?:\s*하기)?$/.test(name)) return;
  const wrap = element.closest<HTMLElement>('.tabWrap.con-tab');
  const nav = element.closest<HTMLElement>('ul.tabNav');
  if (!wrap || !nav || nav.parentElement !== wrap || !element.closest('li')) return;
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (!raw.startsWith('#') || raw.length < 2) return;
  let id: string;
  try { id = decodeURIComponent(raw.slice(1)); } catch { return; }
  const targets = document.querySelectorAll<HTMLElement>(`#${CSS.escape(id)}`);
  if (targets.length !== 1) return;
  const panel = targets[0];
  if (!panel.matches('div.tabPage') || panel.closest('.tabWrap.con-tab') !== wrap
    || !panel.parentElement?.matches('div.tabContents') || panel.parentElement.parentElement !== wrap
    || panel.closest(editable)) return;
  const peers = [...nav.querySelectorAll<HTMLElement>(':scope > li > a[href]')];
  if (peers.length < 2 || peers.length > 12 || !peers.includes(element)) return;
  const titles = headings(panel, true).filter(node => headingName(node, true) === name);
  if (!titles.length) return;
  const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'switch', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem', 'tab', 'dialog']
    .map(role => `[role~="${role}" i]`).join(',');
  const interactivePanel = `${editable},${excluded},a,button,label[for],${interactiveRoles},[tabindex],[onclick],iframe,object,embed,details,summary,audio[controls],video[controls]`;
  const readonlyPanel = !panel.matches(interactivePanel) && !panel.querySelector(interactivePanel);
  // Keep the previously supported subject-backed guidance path, but never
  // claim its panel is readonly when an editor/control is present. New topic
  // names require the stronger actual noninteractive panel relationship.
  if (!readonlyPanel && !/(?:국민\s*연금|사회\s*보장|노후)/.test(name)) return;
  return evidence(candidate, 'nps-explanation', 'named-local-explanation-panel', 'help',
    [wrap, nav, panel.parentElement, panel, ...titles, ...peers], 70,
    readonlyPanel ? { readonlyPanel: true, contentScope: 'content' } : {});
}

function university(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  const academic = academicTabs(candidate, name);
  if (academic) return academic;
  const element = candidate.element;
  const board = element.closest<HTMLElement>('.common-board');
  const title = element.closest<HTMLElement>('dt.board-thumb-content-title');
  const list = element.closest<HTMLElement>('ul.board-thumb-wrap');
  if (!board || !title || !list || !board.contains(list) || !element.matches('a[href]')) return;
  const destination = sourceURL(element);
  if (!destination || destination.pathname !== location.pathname) return;
  // Presence of a document reference is a generic document-kind signal. Its
  // opaque value, document number and the record's source position are unused.
  if (!['articleNo', 'articleId', 'article_no', 'article_id'].some(key => destination.searchParams.has(key))) return;
  const boardTitles = headings(board).filter(node => /(?:IT|전산|정보화|서비스).*게시판/i.test(headingName(node)));
  if (!boardTitles.length) return;
  const label = name.replace(/^\[[^\]]{1,30}\]\s*/, '');
  const incident = /일시\s*(?:중지|중단|장애|순단)|(?:서비스|시스템|네트워크|서버|접속|운영).{0,24}(?:중지|중단|장애|순단)|(?:점검|이관|패치|업그레이드).{0,24}(?:작업|일정)|(?:운영\s*방법|정책|서비스).{0,12}변경/.test(label);
  const instruction = /(?:설치|설정|사용|이용|활용|추가|해결|복구|대처|대응).{0,24}(?:방법|절차|매뉴얼|설명서|가이드|안내)/.test(label);
  if (incident === instruction) return;
  return evidence(candidate, 'smu-it-documents', incident ? 'incident-document' : 'instruction-document',
    incident ? 'notice' : 'help', [board, list, title, ...boardTitles], 70, { contentScope: 'content' });
}

const academicTopic = /학사|학적|학위|학점|전공|교양|휴학|복학|재입학|자퇴|제적|전과|증명서/;
const academicOperation = /신청|예약|접수|조회|로그인|인증|제출|청구|포털|시스템|바로\s*가기|발급\s*하기/;

function academicDocument(element: HTMLElement): boolean {
  const destination = sourceURL(element);
  return !!destination && /^\/kor\/life\/[a-z][a-z0-9_-]*\.do$/i.test(destination.pathname)
    && !/\/(?:apply|application|reserve|reservation|login|signin|sso|portal|issue)\.do$/i.test(destination.pathname)
    && !['articleNo', 'articleId', 'article_no', 'article_id'].some(key => destination.searchParams.has(key));
}

function academicTabs(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  const element = candidate.element;
  if (!element.matches('a[href]') || !academicTopic.test(name) || academicOperation.test(name)) return;
  const list = element.closest<HTMLElement>('ul.tab-ul');
  const outer = element.closest<HTMLElement>('.tab-outer');
  if (!list || !outer || !outer.contains(list) || !outer.parentElement?.matches('.contents-wrap')) return;
  const section = outer.nextElementSibling;
  if (!(section instanceof HTMLElement) || !section.matches('section.content-wrap')) return;
  const content = section.querySelector<HTMLElement>(':scope > .content');
  if (!content) return;
  const titles = [...content.querySelectorAll<HTMLElement>(':scope > h4')].filter(node => !!headingName(node));
  if (titles.length !== 1) return;
  const peers = [...list.querySelectorAll<HTMLElement>(':scope > li > a[href]')];
  if (peers.length < 2 || peers.length > 12 || !peers.includes(element) || !academicDocument(element)) return;
  const selected = peers.filter(peer => peer.parentElement?.matches('.active,.swiper-slide-active')
    || /^(?:page|true)$/i.test(peer.getAttribute('aria-current') ?? ''));
  if (selected.length !== 1 || normalize(candidateLabel(selected[0])) !== headingName(titles[0])
    || !academicTopic.test(headingName(titles[0]))) return;
  const educational = peers.filter(peer => {
    const label = normalize(candidateLabel(peer));
    return !!label && academicTopic.test(label) && !academicOperation.test(label) && academicDocument(peer);
  });
  if (educational.length < 2 || educational.length <= peers.length / 2) return;
  // The following content heading identifies the selected academic topic.
  // No record number, fragment value, page-specific title or URL table is used.
  return evidence(candidate, 'smu-academic-documents', 'selected-topic-following-content', 'academic',
    [outer.parentElement, outer, list, section, content, ...titles, ...selected, ...educational], 70, { contentScope: 'navigation' });
}

const guideDownloadName = /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|download)(?:\s*하기)?$/i;

function libraryGuideButton(element: HTMLElement): { heading: HTMLElement; branch: HTMLElement } | undefined {
  if (!element.matches('button.download_btn') || element.closest(`${editable},${excluded}`) || !candidateLabel(element)) return;
  const heading = element.parentElement;
  const branch = element.closest<HTMLElement>('.link_api_cont');
  const name = normalize(candidateLabel(element));
  if (!heading?.matches('h4.tit') || !branch || heading.parentElement !== branch
    || !guideDownloadName.test(name) || headingName(heading) !== name) return;
  return { heading, branch };
}

function semanticTabName(element: HTMLElement): string {
  const name = normalize(candidateLabel(element));
  const state = [...element.querySelectorAll<HTMLElement>(':scope > .sr-only')]
    .some(node => /^(?:선택됨|selected)$/i.test(normalize(candidateLabel(node))));
  return state ? name.replace(/\s*(?:선택됨|selected)$/i, '').trim() : name;
}

const copyTopic = /복사|복제|출력|인쇄|스캔/;

function copyingTabs(candidate: Candidate, region: HTMLElement, info: HTMLElement,
  slider: HTMLElement, wrapper: HTMLElement, peers: HTMLElement[]): InstitutionEvidence | undefined {
  const titles = [...info.querySelectorAll<HTMLElement>(':scope > h3')].filter(node => copyTopic.test(headingName(node)));
  if (!titles.length || peers.some(peer => !copyTopic.test(semanticTabName(peer)))) return;
  const selected = peers.filter(peer => peer.parentElement?.matches('.on,.swiper-slide-active')
    || /^(?:page|true)$/i.test(peer.getAttribute('aria-current') ?? ''));
  if (selected.length !== 1) return;
  const bodies = [...region.querySelectorAll<HTMLElement>(':scope > .content_wrap > .sub_content > .copy_data_wrap')];
  if (bodies.length !== 1 || bodies[0].closest(excluded)) return;
  const body = bodies[0];
  const labels = [...body.querySelectorAll<HTMLElement>(':scope > .txt > .s_tit')];
  if (labels.length > 12) return;
  const instruction = labels.filter(node => /^(?:이용|사용)\s*(?:안내|방법)$|(?:복사|복제|인쇄|출력|스캔).{0,20}(?:방법|안내|절차)$/.test(fixedName(node))
    && !node.parentElement?.querySelector(`${editable},form,a[href],button,[role~="button" i]`));
  if (!instruction.length) return;
  return evidence(candidate, 'nl-reading-guides', 'local-copying-instruction-tabs', 'help',
    [region, info, slider, wrapper, body, ...titles, ...instruction, ...peers,
      ...selected.map(peer => peer.parentElement!)], 70, { contentScope: 'content' });
}

function refundEntry(candidate: Candidate, name: string, region: HTMLElement): InstitutionEvidence | undefined {
  const element = candidate.element;
  if (candidate.action !== 'navigate' || !element.matches('a[href]') || !/(?:환급|환불|반환)/.test(name)) return;
  const destination = sourceURL(element);
  if (!destination || !/^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(destination.pathname)
    || destination.pathname === location.pathname) return;
  const paragraph = element.parentElement;
  const block = paragraph?.parentElement;
  const body = element.closest<HTMLElement>('.copy_data_wrap');
  const title = block?.previousElementSibling;
  if (!paragraph?.matches('p') || !block?.matches('.txt') || !body || body.closest('#sub_content') !== region
    || block.parentElement !== body || !(title instanceof HTMLElement) || !title.matches('h4.tit')
    || !/(?:환급|환불|반환).{0,20}(?:안내|방법|절차)/.test(headingName(title))
    || paragraph.closest(`${editable},${excluded}`) || paragraph.querySelector(editable)
    || paragraph.querySelectorAll('a[href]').length !== 1) return;
  // Read one bounded fixed instruction name through the analyzer's safe getter.
  // Only derived relationship tokens enter the fingerprint; prose is not logged.
  const method = normalize(getSafeLabel(paragraph));
  if (!/(?:신청|접수)\s*(?:방법|절차)/.test(method)
    || !/(?:메뉴|항목).{0,18}(?:직접\s*)?(?:신청|접수)/.test(method)) return;
  return evidence(candidate, 'nl-service-entry', 'explicit-refund-application-method', 'apply',
    [region, body, title, block, paragraph], 70,
    { pageTask: 'control', contentScope: 'content', tokens: ['application-method', 'named-menu-entry'] });
}

function library(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  const element = candidate.element;
  const region = element.closest<HTMLElement>('#sub_content');
  if (!region) return;
  const ownGuide = libraryGuideButton(element);
  if (ownGuide) return evidence(candidate, 'nl-reading-guides', 'editorial-guide-download', 'help',
    [region, ownGuide.branch, ownGuide.heading], 70, { contentScope: 'content' });
  const refund = refundEntry(candidate, name, region);
  if (refund) return refund;
  if (!element.matches('a[href]') || serviceEntry.test(name)) return;
  const group = element.parentElement;
  const wrapper = group?.parentElement;
  const slider = wrapper?.parentElement;
  const info = slider?.parentElement;
  if (!group?.matches('[role~="group"]') || !wrapper?.matches('.swiper-wrapper')
    || !slider?.matches('.depth4-menu__slider') || !info?.matches('.content_info')
    || info.closest('#sub_content') !== region) return;
  const peers = [...wrapper.querySelectorAll<HTMLElement>(':scope > [role~="group"] > a[href]')];
  if (peers.length < 2 || peers.length > 8 || !peers.includes(element)) return;
  if (peers.some(peer => {
    const destination = sourceURL(peer);
    return !destination || !/^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(destination.pathname)
      || !candidateLabel(peer) || serviceEntry.test(semanticTabName(peer));
  })) return;
  const copying = copyingTabs(candidate, region, info, slider, wrapper, peers);
  if (copying) return copying;
  const titles = [...info.querySelectorAll<HTMLElement>(':scope > h3')].filter(node => /검색/.test(headingName(node)));
  if (!titles.length) return;
  const semanticName = semanticTabName(element);
  if (!/(?:검색|결과|정보|기능|정렬|색인|서지)/.test(semanticName)
    || peers.some(peer => {
      const destination = sourceURL(peer);
      return !destination || !/^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(destination.pathname)
        || !candidateLabel(peer) || serviceEntry.test(semanticTabName(peer));
    })) return;
  const guides = [...region.querySelectorAll<HTMLElement>('.link_api_cont > h4.tit > button.download_btn')];
  if (guides.length !== 1 || !libraryGuideButton(guides[0]) || !isVisible(guides[0])) return;
  const guide = libraryGuideButton(guides[0])!;
  return evidence(candidate, 'nl-reading-guides', 'local-explanatory-guide-tabs', 'help',
    [region, info, slider, wrapper, group, ...titles, ...peers, guides[0], guide.branch, guide.heading], 70, { contentScope: 'content' });
}

function safetyGuidance(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  const element = candidate.element;
  if (!(element instanceof HTMLButtonElement) || element.type !== 'button' || element.form) return;
  const region = element.closest<HTMLElement>('.cont-area');
  const content = region?.closest<HTMLElement>('.content-right');
  if (!region || !content || !content.closest('#contents')) return;
  const titles = headings(content).filter(node => node.closest('.cont-area') === region
    && /안전.*점검|점검.*(?:안내|가이드)|체크.*가이드|check\s*guide/i.test(headingName(node)));
  if (!titles.length) return;
  if (element.matches('.btn-down') && /(?:점검표|체크리스트|checklist)\s*(?:다운로드|내려\s*받기)$/i.test(name)) {
    return evidence(candidate, 'safekorea-safety-guidance', 'checklist-preparation-document', 'help',
      [content, region, ...titles], 70, { contentScope: 'content' });
  }
  const area = element.parentElement;
  const list = area?.previousElementSibling;
  const guide = list?.previousElementSibling;
  if (!element.matches('.btn-golist') || !area?.matches('.button-rightarea') || area.parentElement !== region
    || !/(?:점검|체크).*(?:리스트|목록|안내).*(?:시작|보기|확인)$/.test(name)
    || !(list instanceof HTMLElement) || !list.matches('ul.comm-list') || list.children.length > 12
    || list.querySelector(`${editable},form,button`)
    || !(guide instanceof HTMLElement) || !guide.matches('h3')
    || !/(?:체크|점검)\s*(?:가이드|안내)|check\s*guide/i.test(headingName(guide))) return;
  return evidence(candidate, 'safekorea-safety-guidance', 'guided-safety-instruction', 'help',
    [content, region, area, list, guide, ...titles], 70, { pageTask: 'control', contentScope: 'content' });
}

// The caller applies the shared danger/URL/label policy before this function.
// This module supplies semantic evidence only; it cannot change an action or
// revive a safety-rejected candidate. No DOM results survive a recheck, even if
// a caller passes a batch cache for future optimization.
export function institutionEvidence(candidate: Candidate, _cache?: InstitutionEvidenceCache): InstitutionEvidence | undefined {
  // Reject unsupported surfaces before performing any source-relationship scan.
  const handler = location.hostname === 'www.safekorea.go.kr' && /^\/safekorea-kor\/edtr\//.test(location.pathname) ? education
    : location.hostname === 'www.safekorea.go.kr' && /^\/safekorea-kor\/acts\/asck\//.test(location.pathname) ? safetyGuidance
    : location.hostname === 'www.nps.or.kr' && /^\/pnsinfo\/ntpsklg\//.test(location.pathname) ? pension
    : location.hostname === 'www.smu.ac.kr' && /^\/kor\/life\/[a-z][a-z0-9_-]*\.do$/i.test(location.pathname) ? university
    : location.hostname === 'www.nl.go.kr' && /^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(location.pathname) ? library : undefined;
  if (!handler) return;
  const element = candidate.element;
  if (location.protocol !== 'https:' || location.port || candidate.context === 'footer'
    || !isVisible(element) || element.closest(`${editable},${excluded}`)
    || !element.matches('a[href],button') || candidateLabel(element) !== candidate.label) return;
  const name = normalize(candidate.label);
  if (!name || name.length > 100) return;
  return handler(candidate, name);
}
