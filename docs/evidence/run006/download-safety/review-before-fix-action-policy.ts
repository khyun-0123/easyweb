import type { ActionType } from './types';

export interface SourceAction { action: ActionType; href?: string; target?: string }

const editableSignalSelector = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
// Exact operation tokens only. Names such as download-guide, no-download or
// icon-download-disabled describe other states and are not download evidence.
const downloadMarkerToken = /^(?:(?:icon|ico|ir)[-_])?download$/i;

// A FileDown operation is accepted only together with the source control's
// own explicit download signal. No page text, response or inferred handler is
// inspected. This bounded metadata also lets snapshots notice marker changes
// even when the resulting locate action stays the same.
export function sourceDownloadEvidence(element: HTMLElement, safeLabel = ''): { text: boolean; icons: string[] } | undefined {
  if (!(element instanceof HTMLAnchorElement) || !element.hasAttribute('href') || element.closest(editableSignalSelector)) return;
  const raw = element.getAttribute('href')?.trim() ?? '';
  // Avoid resolving unrelated source URLs or inspecting their descendants.
  if (!/filedown/i.test(raw)) return;
  try {
    const url = new URL(raw, document.baseURI);
    if (!/^https?:$/.test(url.protocol) || !/(?:^|\/)filedown(?:\.do)?$/i.test(url.pathname)) return;
  } catch { return; }
  const text = /(?:다운로드|내려\s*받기)(?:\s*하기)?$|\bdownload(?:\s+now)?$/i.test(safeLabel.trim());
  const icons: string[] = [];
  for (const icon of element.querySelectorAll<HTMLElement>('i[class*="download" i],svg[class*="download" i],img[class*="download" i],span[class*="download" i]')) {
    if (icon.closest(`${editableSignalSelector},[data-easyweb-host]`)) continue;
    const tokens = (icon.getAttribute('class') ?? '').split(/\s+/)
      .filter(token => token.length <= 64 && downloadMarkerToken.test(token)).sort().slice(0, 4);
    if (tokens.length) icons.push(`${icon.tagName.toLowerCase()}:${tokens.join(' ')}`);
    if (icons.length === 8) break;
  }
  return text || icons.length ? { text, icons } : undefined;
}

// safeLabel은 분석기의 입력 제외 경로로 만든 고정 이름만 전달합니다.
export function isDocumentDownload(element: HTMLElement, safeLabel = ''): boolean {
  if (!(element instanceof HTMLAnchorElement) || !element.hasAttribute('href')) return false;
  return element.hasAttribute('download') || /(?:^|\s)(?:다운로드|download)$/i.test((element.getAttribute('title') ?? '').trim())
    || /\.(?:pdf|hwp|hwpx|docx?|xlsx?|pptx?|odt|rtf)$/i.test(safeLabel.trim())
    || !!sourceDownloadEvidence(element, safeLabel);
}

// 관찰한 링크의 의미를 기술합니다. navigate는 원본 JavaScript가 없다는 증거나
// 복제 URL/원본 click()을 실행해도 된다는 허가가 아닙니다.
export function sourceAction(element: HTMLElement, safeLabel = ''): SourceAction {
  const locate: SourceAction = { action: 'locate' };
  if (!(element instanceof HTMLAnchorElement) || element.isContentEditable) return locate;
  if (isDocumentDownload(element, safeLabel)) return locate;
  const raw = element.getAttribute('href')?.trim() ?? '';
  if (!raw || raw.startsWith('#') || element.matches('[role~="button"], [aria-controls], [aria-haspopup], [download], [onclick], [data-popup-type], [data-toggle], [data-target]')) return locate;
  if (/(?:^|\s)(?:js[-_]?)?popup(?:[-_]open)?(?:\s|$)|(?:^|\s)js[-_]popup[-_]open(?:\s|$)/i.test(element.className)) return locate;
  try {
    const url = new URL(raw, document.baseURI);
    if (!/^https?:$/.test(url.protocol)) return locate;
    if (/\.(?:exe|msi|dmg|pkg|zip|7z|rar|apk|crx)$/i.test(url.pathname)) return locate;
    // 명확한 다운로드 경로 조각만 제어로 취급합니다. download-guide 같은 문서는 제외합니다.
    if (/(?:^|\/)(?:fileDownload|downloadFile|file-download|download)(?:\/|$)/i.test(url.pathname)) return locate;
    const localFragment = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !!url.hash;
    if (localFragment || /(?:^|[\/_.-])(?:sso|oauth2?|saml|authorize)(?:[\/_.-]|$)/i.test(url.pathname)) return locate;
    // 대상 창 이름의 공백을 지워 reserved target으로 바꾸지 않습니다.
    const target = (element.getAttribute('target') ?? document.querySelector('base[target]')?.getAttribute('target') ?? '_self').toLowerCase();
    if (!['_self', '_blank', '_top', '_parent', ''].includes(target)) return locate;
    return { action: 'navigate', href: url.href, target: target || '_self' };
  } catch { return locate; }
}
