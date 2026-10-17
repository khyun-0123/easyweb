import type { ActionType } from './types';

export interface SourceAction { action: ActionType; href?: string; target?: string }

export function sourceAction(element: HTMLElement): SourceAction {
  const locate: SourceAction = { action: 'locate' };
  if (!(element instanceof HTMLAnchorElement) || element.isContentEditable) return locate;
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (!raw || raw.startsWith('#') || element.matches('[role~="button"], [aria-controls], [aria-haspopup], [download], [onclick], [data-popup-type], [data-toggle], [data-target]')) return locate;
  if (/(?:^|\s)(?:js[-_]?)?popup(?:[-_]open)?(?:\s|$)|(?:^|\s)js[-_]popup[-_]open(?:\s|$)/i.test(element.className)) return locate;
  try {
    const url = new URL(raw, document.baseURI);
    if (!/^https?:$/.test(url.protocol)) return locate;
    if (/\.(?:exe|msi|dmg|pkg|zip|7z|rar|apk|crx)$/i.test(url.pathname)) return locate;
    const localFragment = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !!url.hash;
    if (localFragment || /(?:^|[\/_.-])(?:sso|oauth2?|saml|authorize)(?:[\/_.-]|$)/i.test(url.pathname)) return locate;
    const target = (element.getAttribute('target') ?? document.querySelector('base[target]')?.getAttribute('target') ?? '_self').trim().toLowerCase();
    if (!['_self', '_blank', '_top', '_parent', ''].includes(target)) return locate;
    return { action: 'navigate', href: url.href, target: target || '_self' };
  } catch { return locate; }
}
