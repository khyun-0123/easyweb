import { candidateLabel, getSafeLabel, isVisible } from './analyzer';
import { evidenceNodes } from './evidence-nodes';
import type { Candidate, Category, RelationEvidence } from './types';

// Results may be shared only by the caller's current analysis/check batch.
// This module deliberately re-establishes the relationship on every call.
export type DocumentRelationCache = WeakMap<Element, unknown>;
const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const excluded = 'header,footer,nav,aside,article,form,[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i],[role~="complementary" i],[role~="article" i],[role~="form" i]';
const controls = 'a[href],button,[role~="button" i],[role~="tab" i]';
const headings = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();
const preparation = /서식|신청서|신고서|동의서|청구서|작성\s*(?:예|견본)|\b(?:application|consent|request)\s+forms?\b/i;
const operation = /신청|예약|접수|로그인|인증|제출|결제|납부|구매|삭제|탈퇴|(?:발급|지급|조회)\s*하기|\b(?:apply|reserve|submit|login|checkout|payment|delete)\b/i;
const documentKind = /(?:가이드북|안내\s*책자|안내서|설명서|매뉴얼|편람|지침서|핸드북|업무\s*가이드|\b(?:guidebook|handbook|manual))\s*(?:\([^()]{1,30}\))?$/i;
const support = /장학(?:금)?|학자금|학업\s*지원|학생\s*지원|학비\s*지원|\b(?:scholarship|student\s+(?:finance|support|funding))\b/i;
const regulation = /규정|규칙|(?:시행|운영)?\s*세칙|\b(?:regulations?|rules?|bylaws?)\b/i;
const interactive = 'button,input,textarea,select,form,[contenteditable]:not([contenteditable="false" i]),'
  + ['button','tab','checkbox','radio','switch','menuitem','menuitemcheckbox','menuitemradio','option','treeitem','listbox','tree','menu','menubar','grid','scrollbar','radiogroup','tablist']
    .map(role => `[role~="${role}" i]`).join(',');

// Only small fixed names are read: own control, table caption/header, row title,
// and editorial heading. Never read a region's text, input value or checked.
function fixedName(element: HTMLElement, own = false): string {
  if (!isVisible(element) || element.closest(`${editable},${excluded}`)
    || element.hasAttribute('aria-labelledby') || !own && element.matches(`${interactive},${controls}`)) return '';
  const pending = [...element.children];
  let visits = 0;
  while (pending.length) {
    const node = pending.pop()!;
    if (++visits > 64 || node.matches(`${editable},form,[aria-labelledby]`)
      || !own && node.matches(`${interactive},${controls}`)
      || node instanceof HTMLElement && !isVisible(node)) return '';
    pending.push(...node.children);
  }
  return normalize(own ? candidateLabel(element) : getSafeLabel(element));
}

function safeName(element: HTMLElement, own = false): string {
  const value = fixedName(element, own);
  return value.length >= 2 && value.length <= 120 ? value : '';
}

interface TableProof {
  table: HTMLTableElement;
  caption: HTMLTableCaptionElement;
  captionName: string;
  header: HTMLTableSectionElement;
  headerRow: HTMLTableRowElement;
  headers: HTMLTableCellElement[];
  names: string[];
  body: HTMLTableSectionElement;
  rows: HTMLTableRowElement[];
}

function plainTable(table: HTMLTableElement): boolean {
  const pending = [...table.children];
  let visits = 0;
  while (pending.length) {
    const node = pending.pop()!;
    if (++visits > 2048 || node.matches(`table,${editable},${interactive}`)) return false;
    pending.push(...node.children);
  }
  return true;
}

function tableProof(element: HTMLElement): TableProof | undefined {
  const table = element.closest('table');
  if (!(table instanceof HTMLTableElement) || table.closest(`${excluded},${editable}`) || table.matches(interactive) || !isVisible(table)
    || !table.caption || !table.tHead || table.tHead.rows.length !== 1 || table.tBodies.length !== 1) return;
  const header = table.tHead;
  const headerRow = header.rows[0];
  const headers = [...headerRow.cells];
  const body = table.tBodies[0];
  const rows = [...body.rows];
  if (headers.length < 2 || headers.length > 8 || rows.length < 1 || rows.length > 80 || !plainTable(table)
    || headers.some(cell => cell.tagName !== 'TH' || cell.colSpan !== 1 || cell.rowSpan !== 1)
    || !isVisible(header) || !isVisible(body)) return;
  const captionName = safeName(table.caption);
  if (!captionName) return;
  const names = headers.map(cell => safeName(cell));
  if (names.some(name => !name)) return;
  return { table, caption: table.caption, captionName, header, headerRow, headers, names, body, rows };
}

function column(proof: TableProof, pattern: RegExp): number | undefined {
  const matches = proof.names.map((name, index) => pattern.test(name) ? index : -1).filter(index => index >= 0);
  return matches.length === 1 ? matches[0] : undefined;
}

function simpleRow(proof: TableProof, element: HTMLElement): HTMLTableCellElement[] | undefined {
  const row = element.closest('tr');
  if (!(row instanceof HTMLTableRowElement) || row.parentElement !== proof.body
    || !proof.rows.includes(row) || row.querySelector('table') || !isVisible(row)) return;
  const cells = [...row.cells];
  if (cells.length !== proof.headers.length || cells.some(cell => cell.colSpan !== 1 || cell.rowSpan !== 1
    || !isVisible(cell))) return;
  return cells;
}

function tableNodes(proof: TableProof): HTMLElement[] {
  return [proof.table, proof.caption, proof.header, proof.headerRow, ...proof.headers, proof.body];
}

function proof(candidate: Candidate, rule: string, category: Category, dependencies: HTMLElement[],
  fixedNames: HTMLElement[], tokens: string[], relatedLabel?: string): RelationEvidence | undefined {
  const nodes = evidenceNodes([candidate.element, ...dependencies,
    ...dependencies.flatMap(node => node.parentElement ? [node.parentElement] : [])], fixedNames);
  if (!nodes) return;
  const named = new Set(fixedNames);
  return { rule, category, score: 70, pageTask: 'reading', contentScope: 'content',
    ...(relatedLabel ? { relatedLabel } : {}), dependencies: nodes,
    // Source snapshot/current action owns href, target and script safety. No
    // document numbers, opaque query values or source script enter this proof.
    fingerprint: JSON.stringify([rule, category, candidate.label, candidate.action, tokens, relatedLabel ?? '',
      nodes.map(node => [node.tagName,
        ...['class','role','aria-current','aria-selected','aria-expanded','aria-hidden','hidden','rowspan','colspan']
          .map(name => node.getAttribute(name)),
        named.has(node as HTMLElement) ? safeName(node as HTMLElement, node.matches(controls)) : '',
      ])]),
  };
}

function listedDocument(candidate: Candidate, table: TableProof): RelationEvidence | undefined {
  const element = candidate.element;
  if (!documentKind.test(candidate.label) || preparation.test(candidate.label)
    || /(?:발간|제작|배포)\s*(?:행사|보도|소식)|뉴스|기사|채용|입찰/.test(candidate.label)) return;
  const title = column(table, /^(?:제목|문서명|자료명|title|document)$/i);
  const date = column(table, /^(?:작성일|등록일|게시일|발행일|date|published)$/i);
  const attachment = column(table, /^(?:첨부(?:파일)?|파일|attachments?|files?)$/i);
  const department = column(table, /^(?:부서|담당부서|작성부서|department)$/i);
  const cells = simpleRow(table, element);
  if (title === undefined || date === undefined || attachment === undefined || department === undefined
    || new Set([title,date,attachment,department]).size !== 4 || !cells || cells[title] !== element.closest('td,th')
    || cells[title].querySelectorAll(controls).length !== 1 || cells[title].querySelector(interactive)
    || cells.some((cell, index) => index !== title && cell.querySelector(controls))) return;
  const row = element.closest('tr') as HTMLTableRowElement;
  return proof(candidate, 'listed-fixed-document-kind', 'help', [...tableNodes(table), row, ...cells],
    [table.caption, ...table.headers, element], ['title-date-department-attachment', 'own-document-kind']);
}

// Only the nonsemantic floor column may span rows. All name/description/contact
// columns remain one cell per row. Reconstruct the grid rather than relying on
// raw cellIndex after a preceding rowspan; overflow/overlap is rejected.
function directoryRows(table: TableProof, floor: number): { grid: HTMLTableCellElement[][]; nodes: HTMLElement[] } | undefined {
  const grid: HTMLTableCellElement[][] = Array.from({ length: table.rows.length }, () => []);
  const nodes: HTMLElement[] = [];
  for (const [rowIndex, row] of table.rows.entries()) {
    if (!isVisible(row) || row.querySelector('table')) return;
    nodes.push(row);
    let index = 0;
    for (const cell of row.cells) {
      while (grid[rowIndex][index]) index++;
      if (index >= table.headers.length || cell.colSpan !== 1 || !isVisible(cell)
        || cell.rowSpan < 1 || cell.rowSpan > table.rows.length - rowIndex
        || cell.rowSpan !== 1 && index !== floor) return;
      nodes.push(cell);
      for (let offset = 0; offset < cell.rowSpan; offset++) {
        if (grid[rowIndex + offset][index]) return;
        grid[rowIndex + offset][index] = cell;
      }
      index++;
    }
    if (grid[rowIndex].length !== table.headers.length
      || table.headers.some((_, columnIndex) => !grid[rowIndex][columnIndex])) return;
  }
  return { grid, nodes };
}

function directory(candidate: Candidate, table: TableProof): RelationEvidence | undefined {
  if (!/(?:자료실|열람실|시설|공간).{0,16}(?:이용\s*안내|사용\s*안내)|\b(?:room|facility)\s+(?:information|directory|guide)\b/i.test(table.captionName)
    || /예약|신청|결제|대여|구매|\b(?:booking|reservation|payment)\b/i.test(table.captionName)) return;
  const floor = column(table, /^(?:층수|층|위치|floor|location)$/i);
  const kind = column(table, /^(?:구분|유형|종류|type)$/i);
  const name = column(table, /^(?:자료\s*설명|시설명|공간명|자료실명|name|description)$/i);
  const contact = column(table, /^(?:이용\s*문의|문의|연락처|contact)$/i);
  if (floor === undefined || kind === undefined || name === undefined || contact === undefined
    || new Set([floor,kind,name,contact]).size !== 4 || table.headers.length !== 4) return;
  const rows = directoryRows(table, floor);
  const row = candidate.element.closest('tr') as HTMLTableRowElement | null;
  const index = row ? table.rows.indexOf(row) : -1;
  const cells = rows?.grid[index];
  if (!rows || !row || !cells || cells[name] !== candidate.element.closest('td,th')
    || cells[name].rowSpan !== 1 || cells[name].querySelectorAll(controls).length !== 1
    || cells[name].querySelector(interactive) || row.querySelectorAll(controls).length !== 1
    || operation.test(candidate.label) || candidate.label.length > 70) return;
  return proof(candidate, 'aligned-information-directory', 'help', [...tableNodes(table), ...rows.nodes],
    [table.caption, ...table.headers, candidate.element], ['unique-descriptive-column', 'readonly-directory', 'floor-only-rowspan']);
}

function canonicalRule(value: string): string {
  return normalize(value).replace(/\s*(?:다운로드|내려\s*받기|download)\s*$/i, '')
    .replace(/(?:시행|운영)\s*세칙/g, '세칙').replace(/\s+/g, '').toLocaleLowerCase();
}

function academicDocument(candidate: Candidate, table: TableProof): RelationEvidence | undefined {
  const element = candidate.element;
  if (candidate.action !== 'locate' || !element.matches('a[href]')
    || !/^(?:pdf\s*(?:파일\s*)?(?:다운로드|내려\s*받기|download)|(?:파일\s*)?(?:다운로드|download)\s*\(?pdf\)?)$/i.test(candidate.label)
    || !support.test(table.captionName) || !regulation.test(table.captionName) || preparation.test(table.captionName)) return;
  const title = column(table, /^(?:구분|문서명|자료명|제목|title|document)$/i);
  const download = column(table, /^(?:파일\s*\(\s*pdf\s*\)\s*(?:다운로드|내려\s*받기)|pdf\s*(?:다운로드|download)|download\s*\(\s*pdf\s*\))$/i);
  const cells = simpleRow(table, element);
  if (title === undefined || download === undefined || title === download || !cells
    || cells[download] !== element.closest('td,th') || cells[download].querySelectorAll(controls).length !== 1
    || cells[title].querySelector(controls) || element.closest('tr')?.querySelectorAll(controls).length !== 1) return;
  const rowTitle = safeName(cells[title]);
  const authoredTitle = normalize(element.getAttribute('title') ?? '');
  if (!rowTitle || !support.test(rowTitle) || !regulation.test(rowTitle) || preparation.test(rowTitle)
    || !authoredTitle || authoredTitle.length > 120 || !support.test(authoredTitle) || !regulation.test(authoredTitle)
    || preparation.test(authoredTitle) || canonicalRule(rowTitle) !== canonicalRule(authoredTitle)) return;
  const row = element.closest('tr') as HTMLTableRowElement;
  return proof(candidate, 'academic-support-regulation-file', 'academic', [...tableNodes(table), row, ...cells],
    [table.caption, ...table.headers, cells[title], element], [authoredTitle, 'fixed-row-document-title', 'pdf-download-column'], rowTitle);
}

function selected(element: HTMLElement): boolean {
  return [element,element.parentElement].some(node => !!node && (
    /^(?:page|true)$/i.test(node.getAttribute('aria-current') ?? '')
    || /^true$/i.test(node.getAttribute('aria-selected') ?? '')
    || /(?:^|\s)(?:active|selected|current|is-active)(?:\s|$)/i.test(node.getAttribute('class') ?? '')));
}

function readingURL(element: HTMLElement): URL | undefined {
  if (element.matches('[onclick],[aria-controls],[aria-expanded],[aria-haspopup]')) return;
  try {
    const url = new URL(element.getAttribute('href') ?? '', document.baseURI);
    return /^https?:$/.test(url.protocol) && url.origin === location.origin ? url : undefined;
  } catch { return; }
}

function headingKey(value: string): string {
  return normalize(value).replace(/\s*\([^()]{1,30}\)\s*$/, '').replace(/\s+/g, '').toLocaleLowerCase();
}

// Inspect only shallow editorial headings in one local region. Side menus,
// nested sections and arbitrary body prose do not supply the content title.
function localHeadings(root: HTMLElement): HTMLElement[] {
  const pending = [...root.children].map(node => ({ node, depth: 0 }));
  const found: HTMLElement[] = [];
  let visits = 0;
  while (pending.length) {
    if (++visits > 80) return [];
    const { node, depth } = pending.shift()!;
    if (!(node instanceof HTMLElement) || node.matches(`${excluded},${editable},ul,ol,table`)) continue;
    if (node.matches(headings)) { if (safeName(node)) found.push(node); continue; }
    if (depth < 2 && !node.matches('section,[role~="region" i]')) pending.push(...[...node.children].map(child => ({ node: child, depth: depth + 1 })));
  }
  return found;
}

function academicTabs(candidate: Candidate): RelationEvidence | undefined {
  const element = candidate.element;
  if (candidate.action !== 'navigate' || !element.matches('a[href]') || !support.test(candidate.label)
    || operation.test(candidate.label) || preparation.test(candidate.label)) return;
  const list = element.closest<HTMLElement>('ul,ol,[role~="list" i],[role~="tablist" i]');
  if (!list || list.childElementCount < 2 || list.childElementCount > 12 || list.querySelector(`${editable},form`)) return;
  const peers = [...list.querySelectorAll<HTMLElement>(':scope > li > a[href],:scope > [role~="listitem" i] > a[href]')];
  if (peers.length !== list.childElementCount || !peers.includes(element)
    || peers.some(peer => !safeName(peer, true) || !support.test(safeName(peer, true)) || operation.test(safeName(peer, true))
      || preparation.test(safeName(peer, true)) || !readingURL(peer)
      || peer.parentElement?.querySelectorAll(controls).length !== 1)) return;
  const active = peers.filter(selected);
  if (active.length !== 1) return;
  const current = readingURL(active[0]);
  if (!current || current.pathname !== location.pathname || current.search !== location.search) return;
  for (let wrapper: HTMLElement | null = list, depth = 0; wrapper && depth < 5; wrapper = wrapper.parentElement, depth++) {
    if (wrapper.matches(`html,body,${excluded},${editable}`)) break;
    const region = wrapper.nextElementSibling;
    if (!(region instanceof HTMLElement) || !region.matches('section,[role~="region" i]') || region.closest(`${excluded},${editable}`)
      || !isVisible(region)) continue;
    const titles = localHeadings(region).filter(title => support.test(safeName(title))
      && headingKey(safeName(title)) === headingKey(safeName(active[0], true)));
    if (titles.length !== 1) continue;
    const owner = wrapper.parentElement;
    if (!owner) continue;
    const pageTitles = localHeadings(owner).filter(title => !wrapper.contains(title) && !region.contains(title)
      && /학사|학업|학생|\bacademic\b/i.test(safeName(title)) && support.test(safeName(title))
      && !!(title.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (pageTitles.length !== 1) continue;
    return proof(candidate, 'selected-academic-support-documents', 'academic',
      [owner, wrapper, region, list, ...titles, ...pageTitles, ...peers, ...peers.map(peer => peer.parentElement!)],
      [...titles, ...pageTitles, ...peers], ['unique-current-document', 'matching-fixed-content-heading', 'academic-support-owner']);
  }
}

// The shared classifier must run danger URL/script/label checks first. This is
// semantic evidence only: it never executes a source control, changes the name,
// action, href or target, or revives a rejected candidate.
export function documentRelation(candidate: Candidate, _cache?: DocumentRelationCache): RelationEvidence | undefined {
  const element = candidate.element;
  if (candidate.context === 'footer' || !element.matches('a[href],button') || !isVisible(element)
    || element.closest(`${editable},${excluded}`) || element.querySelector(editable)
    || element.hasAttribute('aria-labelledby') || safeName(element, true) !== candidate.label
    || element instanceof HTMLButtonElement && (element.type !== 'button' || !!element.form)) return;
  const table = tableProof(element);
  if (table) return academicDocument(candidate, table) ?? directory(candidate, table) ?? listedDocument(candidate, table);
  return academicTabs(candidate);
}
