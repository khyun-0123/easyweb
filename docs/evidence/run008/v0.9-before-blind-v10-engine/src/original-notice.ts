import type { LocateResult } from './action-bridge';

export function clearOriginalNotice(): void {
  document.querySelector('[data-easyweb-notice]')?.dispatchEvent(new Event('easyweb:dismiss-notice'));
}

export function showOriginalNotice(result: LocateResult, label: string, source: HTMLElement): void {
  clearOriginalNotice();
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const host = document.createElement('div');
  host.dataset.easywebNotice = 'true';
  host.dataset.easywebNoticeReason = result.ok ? 'ready' : result.reason;
  const shadow = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('div');
  panel.setAttribute('role', result.ok ? 'status' : 'alert');
  const text = document.createElement('p');
  text.id = 'easyweb-original-message';
  text.textContent = result.ok ? `원본의 ‘${label}’ 메뉴를 표시했어요. 직접 선택해 주세요.` :
    result.reason === 'changed' ? '원본 메뉴가 바뀌었어요. EasyWeb을 다시 열어 찾아주세요.' :
    result.reason === 'covered' ? '원본 메뉴가 다른 창에 가려져 있어요. 사이트의 팝업을 닫고 다시 찾아주세요.' :
    result.reason === 'unavailable' ? '원본 메뉴가 바뀌었거나 사라졌어요. 다시 EasyWeb을 열어 찾아주세요.' :
    '원본 메뉴를 화면에서 확인하지 못했어요. 원본 화면에서 메뉴를 확인해 주세요.';
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = '안내 닫기';
  dismiss.setAttribute('aria-describedby', text.id);
  const style = document.createElement('style');
  const sourceInLowerHalf = source.isConnected && source.getBoundingClientRect().top > window.innerHeight / 2;
  style.textContent = `:host{all:initial}div{position:fixed;${sourceInLowerHalf ? 'top' : 'bottom'}:16px;right:16px;z-index:2147483647;box-sizing:border-box;width:min(480px,calc(100vw - 32px));max-height:40vh;overflow:auto;padding:16px;background:#fff;color:#172739;border:2px solid #08796e;border-radius:12px;box-shadow:0 4px 20px #17273925;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif}p{margin:0 0 8px;overflow-wrap:anywhere}button{min-height:48px;min-width:48px;padding:8px 16px;background:#fff;color:#172739;border:1px solid #526476;border-radius:8px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #08796e;outline-offset:3px}@media(forced-colors:active){div,button{background:Canvas;color:CanvasText;border-color:CanvasText}button:focus-visible{outline-color:Highlight}}`;
  panel.append(text, dismiss);
  shadow.append(style, panel);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    const restoreFocus = !!shadow.activeElement;
    observer.disconnect();
    document.removeEventListener('keydown', onKey);
    dismiss.removeEventListener('click', close);
    host.removeEventListener('easyweb:dismiss-notice', close);
    host.remove();
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
  const observer = new MutationObserver(() => {
    // SPA replacement can remove this host without sending our dismiss event.
    if (!host.isConnected) close();
  });
  dismiss.addEventListener('click', close);
  host.addEventListener('easyweb:dismiss-notice', close, { once: true });
  document.addEventListener('keydown', onKey);
  observer.observe(document, { childList: true, subtree: true });
  document.body.append(host);
  if (!result.ok) dismiss.focus({ preventScroll: true });
}
