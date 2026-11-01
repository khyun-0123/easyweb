import type { Candidate } from './types';
import { isSafeNavigation } from './classifier';

// Site-wide controls (home, log in, sign up) appear on every page of a site.
// They are a main task only on the home page, so elsewhere they leave the six
// cards and sit in a separate row. Only exact fixed names and plain links
// qualify; nothing is inferred from a site-specific mapping.
export type CommonKind = 'home' | 'login' | 'signup' | 'phone';
export interface CommonAction { kind: CommonKind; candidate: Candidate }

export const COMMON_TITLES: Record<CommonKind, string> = { home: '처음 화면', login: '로그인', signup: '회원가입', phone: '전화 문의' };

const homeLeaf = /^(?:index|main|home)(?:\.[a-z]+)?$/i;
// A site root may carry a language code: /kor.do, /eng/, /site-kor/main/main.do.
const language = '(?:kor?|kr|eng?|jpn?|ja|chn?|zh)';
const languageRoot = new RegExp(`^(?:${language}|[a-z0-9]+[-_]${language})(?:\\.[a-z]+)?$`, 'i');
const homeLabel = /^(?:처음\s*(?:으로|화면(?:으로)?)?|첫\s*화면(?:으로)?|홈(?:\s*(?:으로|화면|페이지))?|home(?:\s*page)?|메인(?:\s*(?:으로|화면|페이지))?|main(?:\s*page)?)$/i;
const loginLabel = /^(?:(?:통합\s*)?로그인(?:\s*하기)?|log\s*-?\s*in|sign\s*-?\s*in)$/i;
const signupLabel = /^(?:회원\s*가입(?:\s*하기)?|sign\s*-?\s*up|join(?:\s*us)?)$/i;
// The survey found a representative phone number essential on most pages.
const phoneContext = /대표|콜\s*센터|고객\s*센터|상담|민원|문의|안내/;
const phoneDigits = (candidate: Candidate) => (candidate.element.getAttribute('href') ?? '').replace(/^tel:/i, '').replace(/[^\d-]/g, '');
const text = (candidate: Candidate) => candidate.label.normalize('NFKC').replace(/\s+/g, ' ').trim();

function isHomePath(url: URL | Location): boolean {
  if (url.search) return false;
  const parts = url.pathname.split('/').filter(Boolean);
  const popped = parts.length && homeLeaf.test(parts.at(-1)!);
  while (parts.length && homeLeaf.test(parts.at(-1)!)) parts.pop();
  // A site prefix named after the host also counts: www.nhis.or.kr/nhis/index.do.
  const sitePrefix = popped && parts.length === 1 && url.hostname.toLowerCase().split('.').includes(parts[0].toLowerCase());
  return parts.length === 0 || sitePrefix || parts.length === 1 && languageRoot.test(parts[0]);
}

export function isHomePage(): boolean {
  return isHomePath(location);
}

function sameOriginURL(candidate: Candidate): URL | undefined {
  try {
    const url = new URL(candidate.href!);
    return url.origin === location.origin ? url : undefined;
  } catch { return; }
}

function isHomeLink(candidate: Candidate): boolean {
  if (!isSafeNavigation(candidate)) return false;
  const url = sameOriginURL(candidate);
  if (!url || !isHomePath(url) || url.pathname === location.pathname && url.search === location.search) return false;
  // A logo link names the site, not "home"; the banner position stands in.
  return homeLabel.test(text(candidate)) || !!candidate.element.closest('header, [role~="banner"]');
}

// Source order decides among equal controls; a footer copy is the last choice.
function first(candidates: Candidate[], test: (candidate: Candidate) => boolean): Candidate | undefined {
  const matches = candidates.filter(test);
  return matches.find(candidate => candidate.context !== 'footer') ?? matches[0];
}

export function commonActions(raw: Candidate[], classified: Candidate[], home = isHomePage()): CommonAction[] {
  const found: CommonAction[] = [];
  const add = (kind: CommonKind, candidate?: Candidate) => { if (candidate) found.push({ kind, candidate }); };
  if (!home) {
    add('home', first(raw, isHomeLink));
    add('login', first(classified, candidate => candidate.category === 'login' && loginLabel.test(text(candidate))));
  }
  add('signup', first(raw, candidate => signupLabel.test(text(candidate)) && isSafeNavigation(candidate)));
  // A tel: link stays an original-location control; the row shows its number.
  const phones = raw.filter(candidate => candidate.element.matches('a[href^="tel:" i]') && phoneDigits(candidate).replace(/-/g, '').length >= 3);
  add('phone', phones.find(candidate => phoneContext.test(text(candidate)) || phoneContext.test(candidate.element.parentElement?.textContent ?? ''))
    ?? phones.find(candidate => candidate.context === 'footer') ?? phones[0]);
  return found;
}

export function phoneNumber(candidate: Candidate): string {
  return phoneDigits(candidate);
}

/** Removes the moved controls and their other copies from the card candidates. */
export function withoutCommon(classified: Candidate[], common: readonly CommonAction[]): Candidate[] {
  const elements = new Set(common.map(item => item.candidate.element));
  const destinations = new Set(common.flatMap(item => item.candidate.action === 'navigate' && item.candidate.href ? [item.candidate.href] : []));
  const login = common.some(item => item.kind === 'login');
  return classified.filter(candidate => !elements.has(candidate.element)
    && !(candidate.action === 'navigate' && candidate.href && destinations.has(candidate.href))
    && !(login && candidate.category === 'login' && loginLabel.test(text(candidate))));
}
