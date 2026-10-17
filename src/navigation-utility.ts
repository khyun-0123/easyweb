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

export interface NavigationCache {
  controls: WeakMap<HTMLElement, { label: string; utility?: NavigationUtility }>;
  items: WeakMap<HTMLElement, HTMLElement[]>;
  menus: WeakMap<HTMLElement, boolean>;
  breadcrumbs: WeakMap<HTMLElement, boolean>;
  targets: Map<string, HTMLElement | undefined>;
  visibility: WeakMap<HTMLElement, boolean>;
}

/** Create only for one synchronous analysis/classification/currentness batch.
 * Every later card, menu or after-focus check must create a fresh cache. These
 * summaries contain fixed structure only and do not observe DOM mutations.
 */
export function createNavigationCache(): NavigationCache {
  return { controls: new WeakMap(), items: new WeakMap(), menus: new WeakMap(), breadcrumbs: new WeakMap(), targets: new Map(), visibility: new WeakMap() };
}

function visibleSource(element: HTMLElement, cache?: NavigationCache): boolean {
  const known = cache?.visibility.get(element);
  if (known !== undefined) return known;
  const visible = element.isConnected && !element.closest('[hidden],[inert],[aria-hidden="true" i],[aria-disabled="true" i]')
    && !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
  cache?.visibility.set(element, visible);
  return visible;
}

function uniqueTarget(id: string, cache?: NavigationCache): HTMLElement | undefined {
  if (!id || id.length > 128) return;
  if (cache?.targets.has(id)) return cache.targets.get(id);
  const nodes = document.querySelectorAll(`#${CSS.escape(id)}`);
  const target = nodes.length === 1 && nodes[0] instanceof HTMLElement ? nodes[0] : undefined;
  cache?.targets.set(id, target);
  return target;
}

function fragmentTarget(element: HTMLElement, cache?: NavigationCache): HTMLElement | undefined {
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (!raw.startsWith('#') || raw.length < 2) return;
  try { return uniqueTarget(decodeURIComponent(raw.slice(1)), cache); }
  catch { return; }
}

function directItems(list: HTMLElement, cache?: NavigationCache): HTMLElement[] {
  const known = cache?.items.get(list);
  if (known) return known;
  // Check the bound before enumerating children. A large document list is not
  // a menu, and copying every child for every source would be quadratic.
  if (!list.matches(listSelector) || list.matches('[role~="tabpanel" i],[role~="listbox" i]')
    || !list.childElementCount || list.childElementCount > 24) {
    cache?.items.set(list, []);
    return [];
  }
  const children = [...list.children];
  const items = children.every(child => child instanceof HTMLElement && child.matches(itemSelector))
    ? children as HTMLElement[] : [];
  cache?.items.set(list, items);
  return items;
}

function menuList(list: HTMLElement, cache?: NavigationCache): boolean {
  const known = cache?.menus.get(list);
  if (known !== undefined) return known;
  const menu = inspectMenuList(list, cache);
  cache?.menus.set(list, menu);
  return menu;
}

function inspectMenuList(list: HTMLElement, cache?: NavigationCache): boolean {
  if (list.closest(`${editable},${form},article,[role~="article" i]`) || list.querySelector(`${editable},${form}`)) return false;
  const items = directItems(list, cache);
  return items.length > 0 && items.every(item => item.matches('a[href],button,[role~="button" i]')
    || !!item.querySelector(':scope > a[href],:scope > button,:scope > [role~="button" i],:scope > div > a[href]'));
}

function breadcrumb(element: HTMLElement, cache?: NavigationCache): boolean {
  const list = element.closest<HTMLElement>('ol,ul,[role~="list" i]');
  if (!list) return false;
  const items = directItems(list, cache);
  if (!items.length || items.length > 12 || element.closest(itemSelector)?.parentElement !== list) return false;
  const known = cache?.breadcrumbs.get(list);
  if (known !== undefined) return known;
  const isBreadcrumb = breadcrumbList(list, items.length);
  cache?.breadcrumbs.set(list, isBreadcrumb);
  return isBreadcrumb;
}

function breadcrumbList(list: HTMLElement, itemCount: number): boolean {
  for (let container: HTMLElement | null = list, level = 0; container && level < 4; container = container.parentElement, level++) {
    if (container.matches('main,section,article,body')) break;
    const navigation = container.matches('nav,[role~="navigation" i]');
    if (breadcrumbName.test(container.getAttribute('aria-label') ?? '') && (navigation || container === list)) return true;
    if (navigation && itemCount >= 2
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

function skipTarget(target: HTMLElement, kind: 'content' | 'navigation', cache?: NavigationCache): boolean {
  if (!visibleSource(target, cache) || target.closest(`${editable},${form}`)
    || target.matches('a,button,[role~="button" i],[role~="tab" i],[role~="tabpanel" i]')) return false;
  if (kind === 'content' && target.matches('main,[role~="main" i]')
    || kind === 'navigation' && target.matches('nav,[role~="navigation" i]')) return true;
  if (!target.matches('div,section,ul,ol')) return false;
  // A complete skip name may point at an unlabelled local content wrapper.
  // Require actual structural content, never a target ID/class spelling.
  if (kind === 'content') return !!target.querySelector(`:scope > ${headingSelector},:scope > div > ${headingSelector}`);
  return menuList(target, cache) || [...target.querySelectorAll<HTMLElement>(':scope > ul,:scope > ol,:scope > div > ul,:scope > div > ol')].some(list => menuList(list, cache));
}

function locallyControlled(element: HTMLElement, cache?: NavigationCache): HTMLElement | undefined {
  const ids = (element.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean);
  if (ids.length !== 1) return;
  const target = uniqueTarget(ids[0], cache);
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
export function navigationUtility(element: HTMLElement, label: string, cache?: NavigationCache): NavigationUtility | undefined {
  const known = cache?.controls.get(element);
  if (known?.label === label) return known.utility;
  const utility = inspectNavigationUtility(element, label, cache);
  cache?.controls.set(element, { label, utility });
  return utility;
}

function inspectNavigationUtility(element: HTMLElement, label: string, cache?: NavigationCache): NavigationUtility | undefined {
  if (!element.matches('a[href],button,[role~="button" i]') || !visibleSource(element, cache)
    || element.closest(`${editable},${form}`) || element.querySelector(editable)
    || element instanceof HTMLButtonElement && !!element.form) return;
  const name = label.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 100) return;
  const anchor = element instanceof HTMLAnchorElement;
  if (anchor) {
    if ((element.getAttribute('rel') ?? '').split(/\s+/).some(token => token.toLowerCase() === 'home') || breadcrumb(element, cache)) return 'position';
    const kind = skipKind(name), target = kind ? fragmentTarget(element, cache) : undefined;
    if (kind && target && skipTarget(target, kind, cache)) return 'position';
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
    const target = locallyControlled(element, cache);
    return expanded && target && menuList(target, cache) ? 'branch' : undefined;
  }
  if (expanded && raw.startsWith('#') && raw.length > 1) {
    const target = fragmentTarget(element, cache);
    return target && target.parentElement === element.parentElement && menuList(target, cache) ? 'branch' : undefined;
  }
  const item = element.closest<HTMLElement>(itemSelector);
  const direct = item && (element.parentElement === item || element.parentElement?.parentElement === item)
    ? item.querySelector<HTMLElement>(`:scope > :is(${listSelector})`) : null;
  if (direct && menuList(direct, cache) && anchor && (raw === '#' || noOpScript.test(raw))) return 'branch';
  const sibling = element.nextElementSibling;
  if (expanded && sibling instanceof HTMLElement && menuList(sibling, cache)
    && (popup === 'menu' || popup === 'true' || !!element.closest('nav,[role~="navigation" i]'))) return 'branch';
}
