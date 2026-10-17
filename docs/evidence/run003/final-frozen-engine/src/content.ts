import { openEasyMode } from './easy-mode';
import { clearOriginalNotice } from './original-notice';

(() => {
  clearOriginalNotice();
  // 같은 파일이 다시 주입되면 이벤트로 기존 인스턴스를 정상 종료합니다.
  const existing = document.querySelector<HTMLElement>('[data-easyweb-host]');
  if (existing) {
    existing.dispatchEvent(new Event('easyweb:close'));
    return;
  }
  const host = document.createElement('div');
  host.dataset.easywebHost = 'true';
  document.body.append(host);
  try {
    const close = openEasyMode(host);
    host.addEventListener('easyweb:close', close, { once: true });
  } catch (error) {
    host.remove();
    console.error('EasyWeb 화면을 열지 못했습니다.', error);
  }
})();
