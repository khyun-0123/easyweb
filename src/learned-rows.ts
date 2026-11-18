import type { RankRow } from './learned-ranker';

// Experiment build only. Lists the visible controls of the page the same way the site survey did
// when the learned ranker's training rows were collected (scripts/site-survey.mjs collect()), so
// position and page-height features match training. Fields contribute only fixed metadata
// (aria-label, placeholder, title, label text); values, checked state and editable content are
// never read. Nothing is stored or sent.

const clip = (s: string | null | undefined, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  for (let n: Element | null = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  }
  return true;
}

function region(el: Element): string {
  const r = el.closest('header,nav,main,aside,footer,[role=banner],[role=navigation],[role=main],[role=contentinfo]');
  return r ? (r.getAttribute('role') || r.tagName.toLowerCase()) : '-';
}

function safeText(el: Element): string {
  let out = '';
  const walk = (n: Node) => {
    if (n.nodeType === 3) { out += n.textContent; return; }
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e.matches('input,textarea,select,[contenteditable=""],[contenteditable=true],script,style')) return;
    if (e.tagName === 'IMG') { out += ' ' + (e.getAttribute('alt') || ''); return; }
    e.childNodes.forEach(walk);
  };
  walk(el);
  return out;
}

function heading(el: Element): string {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const h = n.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > * > h2, :scope > * > h3');
    if (h && !h.contains(el)) return clip(safeText(h), 40);
  }
  return '';
}

export function collectRows(): { rows: RankRow[]; elements: HTMLElement[] } {
  const rows: RankRow[] = [], elements: HTMLElement[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [role=button], [role=link], [role=tab], [role=searchbox], [role=textbox]')) {
    if (!visible(el)) continue;
    const isField = el.matches('input,select,textarea');
    const type = el.tagName === 'INPUT' ? (el.getAttribute('type') || 'text').toLowerCase() : '';
    if (type === 'hidden') continue;
    const labels = (el as HTMLInputElement).labels;
    const label = isField
      ? clip(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || (labels?.[0] ? safeText(labels[0]) : ''), 60)
      : clip(safeText(el) || el.getAttribute('aria-label') || el.getAttribute('title'), 80);
    let href = '';
    if (el.tagName === 'A') {
      const raw = el.getAttribute('href') || '';
      try {
        const u = new URL(raw, location.href);
        href = u.protocol.startsWith('http') ? (u.host === location.host ? '' : u.host) + u.pathname + (u.search ? '?…' : '') : u.protocol;
      } catch { href = raw.slice(0, 20); }
    }
    const r = el.getBoundingClientRect();
    elements.push(el);
    rows.push({ tag: el.tagName.toLowerCase() + (type ? `:${type}` : ''), label, href, region: region(el), heading: heading(el),
      y: Math.round(r.top + scrollY), font: Math.round(parseFloat(getComputedStyle(el).fontSize)) });
  }
  return { rows, elements };
}

// The gate of docs/reviews/business_review_20261118.md section 7: no learned ordering on a page
// with a password field or whose title names login, identity check, payment or account pages.
export function sensitivePage(): boolean {
  if (document.querySelector('input[type=password i]')) return true;
  return /로그인|본인\s*인증|본인확인|결제|마이\s*페이지|회원\s*정보|비밀번호/.test(document.title.split('|')[0]);
}
