export type NavigationUtility = 'position' | 'branch';

const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const form = 'form,[role~="form" i]';
const listSelector = 'ul,ol,[role~="list" i],[role~="menu" i]';
const itemSelector = 'li,[role~="listitem" i],[role~="menuitem" i]';
const regionSelector = 'main,section,article,aside,header,footer,nav,[role~="main" i],[role~="region" i],[role~="navigation" i]';
const headingSelector = ':is(h1,h2,h3,h4,h5,h6,[role~="heading" i])';
const breadcrumbName = /^(?:breadcrumbs?(?:\s+(?:trail|navigation))?|현재\s*위치(?:\s*안내)?|사이트\s*경로)$/i;
const breadcrumbClass = /^(?:breadcrumbs?|breadcrumb[-_]nav(?:igation)?|breadcrumb[-_]trail)$/i;
const noOpScript = /^javascript:\s*(?:;|void\s*\(\s*0\s*\)\s*;?)?$/i;

function visibleSource(element: HTMLElement): boolean {
  return element.isConnected && !element.closest('[hidden],[inert],[aria-hidden="true" i],[aria-disabled="true" i]')
    && !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
}

function uniqueTarget(id: string): HTMLElement | undefined {
  if (!id || id.length > 128) return;
  const nodes = document.querySelectorAll(`#${CSS.escape(id)}`);
  return nodes.length === 1 && nodes[0] instanceof HTMLElement ? nodes[0] : undefined;
}

function fragmentTarget(element: HTMLElement): HTMLElement | undefined {
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (!raw.startsWith('#') || raw.length < 2) return;
  try { return uniqueTarget(decodeURIComponent(raw.slice(1))); }
  catch { return; }
}

function directItems(list: HTMLElement): HTMLElement[] {
  if (!list.matches(listSelector) || list.matches('[role~="tabpanel" i],[role~="listbox" i]')) return [];
  const children = [...list.children];
  return children.length > 0 && children.length <= 24 && children.every(child => child instanceof HTMLElement && child.matches(itemSelector))
    ? children as HTMLElement[] : [];
}

function menuList(list: HTMLElement): boolean {
  if (list.closest(`${editable},${form},article,[role~="article" i]`) || list.querySelector(`${editable},${form}`)) return false;
  const items = directItems(list);
  return items.length > 0 && items.every(item => item.matches('a[href],button,[role~="button" i]')
    || !!item.querySelector(':scope > a[href],:scope > button,:scope > [role~="button" i],:scope > div > a[href]'));
}

function breadcrumb(element: HTMLElement): boolean {
  const list = element.closest<HTMLElement>('ol,ul,[role~="list" i]');
  if (!list) return false;
  const items = directItems(list);
  if (!items.length || items.length > 12 || element.closest(itemSelector)?.parentElement !== list) return false;
  for (let container: HTMLElement | null = list, level = 0; container && level < 4; container = container.parentElement, level++) {
    if (container.matches('main,section,article,body')) break;
    const navigation = container.matches('nav,[role~="navigation" i]');
    if (breadcrumbName.test(container.getAttribute('aria-label') ?? '') && (navigation || container === list)) return true;
    if (navigation && items.length >= 2
      && (container.getAttribute('class') ?? '').split(/\s+/).some(token => breadcrumbClass.test(token))) return true;
  }
  return false;
}

function skipKind(label: string): 'content' | 'navigation' | undefined {
  if (/^(?:본문(?:\s*내용)?|주요\s*(?:내용|콘텐츠)|콘텐츠)(?:\s*(?:으로|로))?\s*(?:바로\s*가기|이동|건너\s*뛰기)$/.test(label)
    || /^(?:(?:skip|jump|go)(?:\s+directly)?\s+to\s+(?:the\s+)?(?:main\s+)?content|skip\s+(?:the\s+)?navigation)$/i.test(label)) return 'content';
  if (/^(?:메뉴|주\s*메뉴|대\s*메뉴|주요\s*메뉴|메인\s*메뉴|내비게이션|네비게이션)(?:\s*(?:으로|로))?\s*(?:바로\s*가기|이동|건너\s*뛰기)$/.test(label)
    || /^(?:skip|jump|go)(?:\s+directly)?\s+to\s+(?:the\s+)?(?:main\s+)?(?:navigation|menu)$/i.test(label)) return 'navigation';
}

function skipTarget(target: HTMLElement, kind: 'content' | 'navigation'): boolean {
  if (!visibleSource(target) || target.closest(`${editable},${form}`)
    || target.matches('a,button,[role~="button" i],[role~="tab" i],[role~="tabpanel" i]')) return false;
  if (kind === 'content' && target.matches('main,[role~="main" i]')
    || kind === 'navigation' && target.matches('nav,[role~="navigation" i]')) return true;
  if (!target.matches('div,section,ul,ol')) return false;
  // A complete skip name may point at an unlabelled local content wrapper.
  // Require actual structural content, never a target ID/class spelling.
  if (kind === 'content') return !!target.querySelector(`:scope > ${headingSelector},:scope > div > ${headingSelector}`);
  return menuList(target) || [...target.querySelectorAll<HTMLElement>(':scope > ul,:scope > ol,:scope > div > ul,:scope > div > ol')].some(menuList);
}

function locallyControlled(element: HTMLElement): HTMLElement | undefined {
  const ids = (element.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean);
  if (ids.length !== 1) return;
  const target = uniqueTarget(ids[0]);
  if (!target || target === element || element.contains(target)
    || element.closest(regionSelector) !== target.closest(regionSelector)) return;
  const parent = element.parentElement;
  return parent && parent !== document.body && (target.parentElement === parent
    || !!element.closest(itemSelector)?.contains(target)) ? target : undefined;
}

/** A negative semantic boundary only; this never activates a source control.
 * The caller supplies its existing safe fixed name. No body text, other control
 * names, form values or opaque URL/query states are read by this module.
 * Position controls may be excluded. Branch controls suppress broad reading
 * fallbacks only; explicit own help/application/document intents remain valid.
 */
export function navigationUtility(element: HTMLElement, label: string): NavigationUtility | undefined {
  if (!element.matches('a[href],button,[role~="button" i]') || !visibleSource(element)
    || element.closest(`${editable},${form}`) || element.querySelector(editable)
    || element instanceof HTMLButtonElement && !!element.form) return;
  const name = label.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 100) return;
  const anchor = element instanceof HTMLAnchorElement;
  if (anchor) {
    if ((element.getAttribute('rel') ?? '').split(/\s+/).some(token => token.toLowerCase() === 'home') || breadcrumb(element)) return 'position';
    const kind = skipKind(name), target = kind ? fragmentTarget(element) : undefined;
    if (kind && target && skipTarget(target, kind)) return 'position';
  }
  if (element.matches('[role~="tab" i]') || element.closest('dl,[role~="tabpanel" i]')
    || /[?？]$/.test(name)) return;
  const raw = element.getAttribute('href')?.trim() ?? '';
  // Ordinary document links retain their own destination, including a link
  // that is also styled as a parent menu item. JS alone is not a disclosure.
  if (anchor && raw && !raw.startsWith('#') && !/^javascript:/i.test(raw)) return;
  const expanded = /^(?:true|false)$/i.test(element.getAttribute('aria-expanded') ?? '');
  const popup = element.getAttribute('aria-haspopup')?.toLowerCase();
  if (popup && popup !== 'menu' && popup !== 'true') return;
  const controls = element.hasAttribute('aria-controls');
  if (controls) {
    const target = locallyControlled(element);
    return expanded && target && menuList(target) ? 'branch' : undefined;
  }
  if (expanded && raw.startsWith('#') && raw.length > 1) {
    const target = fragmentTarget(element);
    return target && target.parentElement === element.parentElement && menuList(target) ? 'branch' : undefined;
  }
  const item = element.closest<HTMLElement>(itemSelector);
  const direct = item && (element.parentElement === item || element.parentElement?.parentElement === item)
    ? item.querySelector<HTMLElement>(`:scope > :is(${listSelector})`) : null;
  if (direct && menuList(direct) && anchor && (raw === '#' || noOpScript.test(raw))) return 'branch';
  const sibling = element.nextElementSibling;
  if (expanded && sibling instanceof HTMLElement && menuList(sibling)
    && (popup === 'menu' || popup === 'true' || !!element.closest('nav,[role~="navigation" i]'))) return 'branch';
}
