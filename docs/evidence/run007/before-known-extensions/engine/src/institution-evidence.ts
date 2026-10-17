import { candidateLabel, getSafeLabel, isVisible } from './analyzer';
import type { Candidate, Category, InstitutionEvidence } from './types';

export type { InstitutionEvidence } from './types';
export type ClassificationMode = 'generic' | 'institution';
export const ADAPTER_VERSION = 1;
export type InstitutionEvidenceCache = WeakMap<Element, unknown>;

const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const excluded = 'header,footer,article,aside,form,[role~="banner" i],[role~="contentinfo" i],[role~="article" i],[role~="complementary" i],[role~="form" i]';
const headingSelector = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const serviceEntry = /신청|예약|접수|발급|조회|로그인|인증|제출|청구/;

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

function evidence(candidate: Candidate, adapter: string, rule: string, category: Category,
  dependencies: HTMLElement[], score: 65 | 70 = 70): InstitutionEvidence {
  const unique = [...new Set([candidate.element, ...dependencies])];
  return {
    adapter, version: ADAPTER_VERSION, rule, category, score, pageTask: 'reading', dependencies: unique,
    // Raw URL queries, original scripts, input values and whole-region text are
    // deliberately absent. The generic source snapshot owns action/href checks.
    fingerprint: JSON.stringify([ADAPTER_VERSION, adapter, rule, location.origin, location.pathname,
      candidate.label, candidate.action, unique.map(node => [node.tagName,
        ...['id', 'class', 'role', 'aria-controls', 'aria-expanded', 'aria-hidden', 'hidden'].map(name => node.getAttribute(name)),
        node.matches(headingSelector) ? headingName(node, true) : node === candidate.element ? candidateLabel(node) : '',
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
      return evidence(candidate, 'safekorea-education', 'local-reading-menu', 'help', [root, menu, ...titles], 65);
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
    [root, tabs, ...titles, ...peers, ...panels as HTMLElement[], ...panelHeadings]);
}

function pension(candidate: Candidate, name: string): InstitutionEvidence | undefined {
  const element = candidate.element;
  if (!element.matches('a[href]') || serviceEntry.test(name) || !/(?:국민\s*연금|사회\s*보장|노후)/.test(name)) return;
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
  return evidence(candidate, 'nps-explanation', 'named-local-explanation-panel', 'help',
    [wrap, nav, panel.parentElement, panel, ...titles]);
}

function university(candidate: Candidate, name: string): InstitutionEvidence | undefined {
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
    incident ? 'notice' : 'help', [board, list, title, ...boardTitles]);
}

// The caller applies the shared danger/URL/label policy before this function.
// This module supplies semantic evidence only; it cannot change an action or
// revive a safety-rejected candidate. No DOM results survive a recheck, even if
// a caller passes a batch cache for future optimization.
export function institutionEvidence(candidate: Candidate, _cache?: InstitutionEvidenceCache): InstitutionEvidence | undefined {
  // Reject unsupported surfaces before performing any source-relationship scan.
  const handler = location.hostname === 'www.safekorea.go.kr' && /^\/safekorea-kor\/edtr\//.test(location.pathname) ? education
    : location.hostname === 'www.nps.or.kr' && /^\/pnsinfo\/ntpsklg\//.test(location.pathname) ? pension
    : location.hostname === 'www.smu.ac.kr' && /^\/kor\/life\/[a-z][a-z0-9_-]*\.do$/i.test(location.pathname) ? university : undefined;
  if (!handler) return;
  const element = candidate.element;
  if (location.protocol !== 'https:' || location.port || candidate.context === 'footer'
    || !isVisible(element) || element.closest(`${editable},${excluded}`)
    || !element.matches('a[href],button') || candidateLabel(element) !== candidate.label) return;
  const name = normalize(candidate.label);
  if (!name || name.length > 100) return;
  return handler(candidate, name);
}
