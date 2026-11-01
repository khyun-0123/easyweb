import type { Candidate, Category } from './types';
import { isSafeSource } from './classifier';
import { isDocumentDownload } from './action-policy';
import { commonActions, isHomePage, withoutCommon, type CommonAction } from './common-actions';
import { rank } from './ranker';

// Page types from the 2026-11-01 survey (docs/reviews/site_survey_20261101.md).
// Each type fills its leading cards from the page's own structure; anything
// left falls back to rank(). Only fixed structure and visible names are read,
// never a site-specific path. A weak signal leaves the page at 'default'.
export type PageType = 'gate' | 'list' | 'post' | 'default';
export interface FirstScreen {
  type: PageType;
  common: CommonAction[];
  cards: Candidate[];
  /** Every other shown-able control, for 「다른 기능 보기」. */
  pool: Candidate[];
}

const MAX_CARDS = 6;
// A post page needs only a few controls; the survey's median was four.
const POST_CARDS = 4;
const outside = 'header, nav, footer, aside, [role~="banner" i], [role~="navigation" i], [role~="contentinfo" i], [role~="complementary" i]';
const text = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
// Board badges appended to titles; removed from the card title only.
const titleBadges = /(?:\s*(?:새\s*글|new|n|첨부\s*파일(?:\s*있음)?|파일\s*첨부|hot|조회\s*수?\s*\d+))+$/i;
const pinnedMark = /^\[?(?:공지|고정|필독|notice)\]?$/i;
const backToList = /^(?:목록|목록\s*보기|목록으로(?:\s*가기)?|리스트|list)$/i;
// JS \b is ASCII-only, so Korean word ends are written out.
const neighbour = /^(?:(?:이전|다음|윗|아랫)\s*글(?![가-힣])|(?:이전|다음)(?=[\s:]))/;
const gateLink = /바로\s*가기$/;
const boardDate = /(?:19|20)\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}|\b\d{2}[.\-/]\d{2}[.\-/]\d{2}\b/;

// A control the classifier already accepted keeps its category and evidence
// (institution/generic modes differ); the slot only adds card wording.
let classifiedBy = new Map<Element, Candidate>();
function slot(candidate: Candidate, category: Category, title: string, description: string): Candidate {
  const known = classifiedBy.get(candidate.element);
  if (known) return { ...known, title, description };
  return { ...candidate, category, title, description, score: Math.max(candidate.score, 70), reasons: [...candidate.reasons, '페이지 유형 칸'] };
}

const inBody = (candidate: Candidate) => !candidate.element.closest(outside) && candidate.context === 'body';
const destination = (candidate: Candidate) => candidate.action === 'navigate' && candidate.href ? candidate.href : '';

interface Row { candidate: Candidate; pinned: boolean }

// The main document list: one long link per row, five or more rows under one
// parent, in the page body. Short menu lists do not qualify (median title).
function documentList(raw: Candidate[]): Row[] {
  const groups = new Map<Element, Map<Element, Candidate>>();
  for (const candidate of raw) {
    if (!inBody(candidate) || !isSafeSource(candidate) || text(candidate.label).length < 6 || !/[가-힣a-z]/i.test(candidate.label)) continue;
    const row = candidate.element.closest('tr, li, [role~="row" i]');
    if (!row?.parentElement || row.closest(outside)) continue;
    const rows = groups.get(row.parentElement) ?? new Map<Element, Candidate>();
    const known = rows.get(row);
    if (!known || text(known.label).length < text(candidate.label).length) rows.set(row, candidate);
    groups.set(row.parentElement, rows);
  }
  let best: Map<Element, Candidate> | undefined;
  for (const rows of groups.values()) if (rows.size >= 5 && (!best || rows.size > best.size)) best = rows;
  if (!best) return [];
  const lengths = [...best.values()].map(candidate => text(candidate.label).length).sort((a, b) => a - b);
  if (lengths[Math.floor(lengths.length / 2)] < 12) return [];
  // Posts of one board open one view (same path, or same folder with a numeric
  // leaf) or one script; a quick menu repeated on every page links elsewhere.
  const shapes = new Map<string, number>();
  for (const candidate of best.values()) {
    let shape = 'locate';
    if (candidate.action === 'navigate' && candidate.href) {
      try { const url = new URL(candidate.href); shape = url.host + url.pathname.replace(/\/[^/]*\d[^/]*$/, '/#'); } catch { shape = candidate.href; }
    }
    shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
  }
  if (Math.max(...shapes.values()) < best.size * 0.6) return [];
  // A board also shows dates on its rows or page numbers below them. Without
  // either, a list of long links (forms, guides) keeps the general rule.
  const dated = [...best.keys()].filter(row => boardDate.test(row.textContent ?? '')).length;
  const pages = raw.filter(candidate => inBody(candidate) && /^(?:\d{1,3}|다음\s*페이지|next)$/i.test(text(candidate.label))).length;
  if (dated < best.size * 0.6 && pages < 2) return [];
  // A pinned row marks its first cell (or badge image) instead of a number.
  const pinned = (row: Element) => {
    const cell = row.firstElementChild;
    if (!cell || cell.contains(best!.get(row)!.element)) return /^\[(?:공지|고정|필독)\]/.test(text(row.textContent ?? ''));
    return pinnedMark.test(text(cell.textContent ?? '')) || [...cell.querySelectorAll('img[alt]')].some(image => pinnedMark.test(text(image.getAttribute('alt') ?? '')));
  };
  return [...best].map(([row, candidate]) => ({ candidate, pinned: pinned(row) }));
}

function listSlots(raw: Candidate[], rest: Candidate[], rows: Row[]): { slots: Candidate[]; extra: Candidate[] } {
  // The board's own search field first; a scope selector or button is a fallback.
  const searches = rest.filter(candidate => candidate.category === 'search');
  const field = (candidate: Candidate) => candidate.element.matches('input, [role~="searchbox" i], [role~="textbox" i]');
  const search = searches.find(candidate => inBody(candidate) && field(candidate)) ?? searches.find(inBody) ?? searches.find(field) ?? searches[0];
  // Pinned notices often repeat a post listed below; numbered posts come first.
  const ordered = [...rows.filter(row => !row.pinned), ...rows.filter(row => row.pinned)];
  const seen = new Set<string>();
  const posts: Candidate[] = [];
  for (const { candidate } of ordered) {
    const title = text(candidate.label).replace(titleBadges, '') || text(candidate.label);
    if (seen.has(title)) continue;
    seen.add(title);
    posts.push(slot(candidate, 'notice', title, '글 읽기'));
  }
  const slots = search ? [search] : [];
  return { slots: [...slots, ...posts.slice(0, MAX_CARDS - slots.length)], extra: posts.slice(MAX_CARDS - slots.length) };
}

function postSlots(raw: Candidate[]): Candidate[] | undefined {
  const body = raw.filter(candidate => inBody(candidate) && isSafeSource(candidate));
  const back = body.find(candidate => backToList.test(text(candidate.label)));
  if (!back) return;
  const downloads = body.filter(candidate => isDocumentDownload(candidate.element, candidate.label) || /다운로드|내려\s*받기/.test(candidate.label))
    .slice(0, 2).map(candidate => slot(candidate, 'apply', text(candidate.label).replace(/\s*(?:다운로드|내려\s*받기)$/, '') || '첨부파일', '첨부파일 내려받기'));
  const neighbours: Candidate[] = [];
  for (const candidate of body) {
    const container = candidate.element.closest('li, tr, dl, dd, p, div');
    const lead = text(container?.textContent ?? '').slice(0, 120);
    const match = lead.match(neighbour);
    if (!match || candidate === back || text(candidate.label).length < 4) continue;
    const name = /다음|아랫/.test(match[0]) ? '다음 글' : '이전 글';
    if (neighbours.some(item => item.title === name)) continue;
    neighbours.push(slot(candidate, 'notice', name, text(candidate.label).replace(titleBadges, '')));
  }
  return [...downloads, slot(back, 'notice', '목록으로', '글 목록으로 돌아가기'), ...neighbours];
}

// A gate page offers a few sites to choose from, each as a large 바로가기 link.
function gateSlots(raw: Candidate[]): Candidate[] | undefined {
  if (raw.length > 40) return;
  const links = raw.filter(candidate => candidate.context !== 'footer' && isSafeSource(candidate) && gateLink.test(text(candidate.label)) && text(candidate.label).length >= 8);
  const distinct = links.filter((candidate, index) => links.findIndex(other => (destination(other) || other.element) === (destination(candidate) || candidate.element)) === index);
  if (distinct.length < 3) return;
  return distinct.slice(0, MAX_CARDS).map(candidate => {
    const heading = [...candidate.element.querySelectorAll('strong, b, h2, h3, h4, em, span, p')]
      .map(node => text(node.textContent ?? '')).find(value => value.length >= 2 && value.length <= 24);
    return slot(candidate, 'apply', heading ?? text(candidate.label).replace(gateLink, '').slice(0, 24), '이 사이트로 이동');
  });
}

export function composeFirstScreen(raw: Candidate[], classified: Candidate[]): FirstScreen {
  const common = commonActions(raw, classified);
  const rest = withoutCommon(classified, common);
  classifiedBy = new Map(classified.map(candidate => [candidate.element, candidate]));
  let type: PageType = 'default';
  let slots: Candidate[] = [];
  let extra: Candidate[] = [];
  let target = MAX_CARDS;
  const gate = gateSlots(raw);
  const rows = gate || isHomePage() ? [] : documentList(raw);
  const post = gate || rows.length ? undefined : isHomePage() ? undefined : postSlots(raw);
  if (gate) { type = 'gate'; slots = gate; }
  else if (rows.length) { type = 'list'; ({ slots, extra } = listSlots(raw, rest, rows)); }
  else if (post) { type = 'post'; slots = post; target = Math.max(POST_CARDS, Math.min(post.length, MAX_CARDS)); }
  slots = slots.slice(0, MAX_CARDS);
  const elements = new Set(slots.map(candidate => candidate.element));
  const destinations = new Set(slots.map(destination).filter(Boolean));
  const remaining = rest.filter(candidate => !elements.has(candidate.element) && !(destination(candidate) && destinations.has(destination(candidate))));
  const cards = slots.length >= target ? slots : [...slots, ...rank(remaining).slice(0, target - slots.length)];
  classifiedBy = new Map();
  return { type, common, cards, pool: [...extra, ...remaining] };
}
