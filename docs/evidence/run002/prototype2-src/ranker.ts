import type { Candidate, Category } from './types';

const MAX_CARDS = 6;
// A focused page can offer a help index, a question and a reading control.
// Category diversity still gets first choice; the total remains six cards.
const MAX_PER_CATEGORY = 3;
const MAX_PAGE_TASKS = 3;
const contextOrder = { primary: 0, body: 1, footer: 2 };
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const normalizedLabel = (candidate: Candidate) => candidate.label.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

function destination(candidate: Candidate): string {
  if (candidate.action !== 'navigate' || !candidate.href) return '';
  try { return new URL(candidate.href).href; }
  catch { return candidate.href; }
}

function isPageTask(candidate: Candidate): boolean {
  return !!candidate.pageTask && candidate.context !== 'footer' && !candidate.element.closest('header, [role~="banner"]');
}

function pagePriority(candidate: Candidate): number {
  if (candidate.context === 'footer') return -1;
  if (isPageTask(candidate)) {
    const purposeMatch = candidate.pagePurpose === 'academic-calendar' && candidate.category === 'academic'
      || candidate.pagePurpose === 'help' && candidate.category === 'help';
    return purposeMatch ? 3 : 2;
  }
  // A local contents menu remains distinct from the site's global header.
  return candidate.context === 'primary' && !!candidate.element.closest('nav, [role~="navigation"]')
    && !candidate.element.closest('header, [role~="banner"]') ? 1 : 0;
}

function readingOrder(a: Candidate, b: Candidate): number {
  if (a.category !== b.category || a.pageTask !== 'reading' || b.pageTask !== 'reading') return 0;
  const container = a.element.closest('ul, ol, table, [role~="list"], [role~="grid"]');
  if (!container || container !== b.element.closest('ul, ol, table, [role~="list"], [role~="grid"]')) return 0;
  const position = a.element.compareDocumentPosition(b.element);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
}

function compare(a: Candidate, b: Candidate): number {
  return pagePriority(b) - pagePriority(a) || b.score - a.score || readingOrder(a, b)
    || contextOrder[a.context] - contextOrder[b.context]
    || a.label.length - b.label.length || compareText(normalizedLabel(a), normalizedLabel(b))
    || compareText(destination(a), destination(b)) || compareText(a.category ?? '', b.category ?? '')
    || compareText(a.action, b.action) || compareText(a.element.id, b.element.id);
}

export function rank(candidates: Candidate[]): Candidate[] {
  // Deduplicate actual destinations and source controls before category policy.
  // Separate locate controls with the same label can perform different tasks.
  const destinations = new Set<string>();
  const controls = new Set<HTMLElement>();
  const unique = [...candidates].filter(candidate => candidate.category).sort(compare).filter(candidate => {
    const href = destination(candidate);
    if (href) {
      if (destinations.has(href)) return false;
      destinations.add(href);
    } else {
      if (controls.has(candidate.element)) return false;
      controls.add(candidate.element);
    }
    return true;
  });
  const counts = new Map<Category, number>();
  const selected: Candidate[] = [];
  // Reserve bounded space for source-backed tasks on the current page. A mere
  // body keyword does not acquire this evidence. Then retain category diversity.
  for (const candidate of unique) {
    if (!candidate.category || !isPageTask(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
    counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
    selected.push(candidate);
    if (selected.length === MAX_PAGE_TASKS) break;
  }
  for (const candidate of unique) {
    if (!candidate.category || counts.has(candidate.category)) continue;
    counts.set(candidate.category, 1);
    selected.push(candidate);
    if (selected.length === MAX_CARDS) return selected;
  }
  for (const candidate of unique) {
    if (!candidate.category || selected.includes(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
    counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
    selected.push(candidate);
    if (selected.length === MAX_CARDS) break;
  }
  return selected.sort(compare);
}
