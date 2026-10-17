import styles from './styles.css';
import { analyzePage } from './analyzer';
import { classify } from './classifier';
import { rank } from './ranker';
import { locateOriginal } from './action-bridge';
import { isCandidateCurrent, watchCandidates } from './page-session';
import { CATEGORY_INFO, type Candidate } from './types';

const paths: Record<string, string> = {
  brand: '<path d="M6 5h14M6 12h11M6 19h14M3 5h.01M3 12h.01M3 19h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external: '<path d="M14 3h7v7m0-7L11 13M10 3H3v18h18v-7"/>',
  refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6"/>',
};

function icon(name: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths[name] ?? paths.help; // 빌드에 포함된 정적 SVG만 사용
  return svg;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function openEasyMode(host: HTMLElement): () => void {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const scroll = { x: window.scrollX, y: window.scrollY };
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const dialog = el('dialog');
  dialog.lang = 'ko';
  dialog.dir = 'ltr';
  dialog.setAttribute('aria-labelledby', 'easyweb-title');
  dialog.setAttribute('aria-describedby', 'easyweb-description');
  shadow.append(style, dialog);
  let stopWatching = () => {};
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stopWatching();
    dialog.close();
    host.remove();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    window.scrollTo(scroll.x, scroll.y);
  };
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && shadow.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && shadow.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });

  const topbar = el('header', 'topbar');
  const topInner = el('div', 'top-inner');
  const brand = el('div', 'brand');
  const mark = el('span', 'brand-mark');
  mark.append(icon('brand'));
  const name = el('div', '', 'EasyWeb');
  name.append(el('small', '', '복잡한 화면을 더 쉽게'));
  brand.append(mark, name);
  const closeButton = el('button', 'close');
  closeButton.type = 'button';
  closeButton.append(icon('close'), el('span', '', '원본 화면 보기'));
  closeButton.addEventListener('click', close);
  topInner.append(brand, closeButton);
  topbar.append(topInner);

  const shell = el('main', 'shell');
  const site = el('div', 'site');
  site.append(el('span', 'dot'), el('span', '', '지금 보고 있는 사이트'), el('strong', '', location.hostname), el('span', 'site-tag', '쉬운 화면'));
  const intro = el('div', 'intro');
  const title = el('h1', '', '무엇을 하시겠어요?');
  title.id = 'easyweb-title';
  const description = el('p', '', '이 페이지에서 찾은 주요 기능을 한곳에 모았어요.');
  description.id = 'easyweb-description';
  intro.append(title, description);
  const label = el('div', 'section-label');
  const sectionTitle = el('h2', '', '바로 이용하기');
  sectionTitle.id = 'easyweb-actions';
  const refresh = el('button', 'refresh');
  refresh.type = 'button';
  refresh.append(icon('refresh'), document.createTextNode('다시 찾기'));
  label.append(sectionTitle, refresh);
  const grid = el('section', 'grid');
  grid.setAttribute('aria-labelledby', sectionTitle.id);
  const changeNotice = el('p', 'change-notice');
  changeNotice.hidden = true;
  changeNotice.setAttribute('role', 'status');
  const hint = el('aside', 'hint');
  const hintText = el('p');
  hintText.append(el('strong', '', '로그인·인증·신청은 원래 사이트에서 진행해요.'), el('br'), document.createTextNode('원하는 기능이 없으면 ‘원본 화면 보기’를 눌러주세요.'));
  hint.append(icon('help'), hintText);
  const bottom = el('footer', 'bottom');
  const status = el('span', 'status');
  status.setAttribute('role', 'status');
  bottom.append(status, el('span', '', '언제든 Esc 키로 원본 화면에 돌아갈 수 있어요'));
  shell.append(site, intro, changeNotice, label, grid, hint, bottom);
  dialog.append(topbar, shell);
  let items: Candidate[] = [];
  let stale = false;
  function markStale() {
    if (stale || closed) return;
    stale = true;
    changeNotice.textContent = '원본 페이지가 바뀌었어요. 다시 찾기를 눌러주세요.';
    changeNotice.hidden = false;
    for (const item of grid.querySelectorAll('.card')) {
      item.setAttribute('aria-disabled', 'true');
      // 브라우저의 우클릭·주소 복사 경로에도 생성 당시의 URL을 남기지 않습니다.
      if (item instanceof HTMLAnchorElement) {
        item.removeAttribute('href');
        item.setAttribute('role', 'link');
        item.tabIndex = 0;
      }
    }
  }

  function card(candidate: Candidate): HTMLElement {
    const info = CATEGORY_INFO[candidate.category!];
    const item = candidate.action === 'navigate' ? el('a', 'card') : el('button', 'card');
    item.dataset.category = candidate.category;
    const guard = (event: Event) => {
      if (!stale && isCandidateCurrent(candidate)) return true;
      event.preventDefault();
      markStale();
      return false;
    };
    if (item instanceof HTMLAnchorElement) {
      item.href = candidate.href!;
      item.target = candidate.target ?? '_self';
      item.addEventListener('click', guard);
      item.addEventListener('auxclick', guard);
      item.addEventListener('contextmenu', guard);
      item.addEventListener('dragstart', guard);
      // 새 창 동작은 사용자에게 표시하고 opener를 차단합니다.
      if (item.target === '_blank') {
        item.rel = 'noopener noreferrer';
      }
    } else if (item instanceof HTMLButtonElement) {
      item.type = 'button';
      item.addEventListener('click', event => {
        if (!guard(event)) return;
        locateOriginal(candidate, close);
      });
    }
    const image = el('span', 'card-icon');
    image.append(icon(info.icon));
    const actionText = candidate.action === 'navigate' ? item instanceof HTMLAnchorElement && item.target === '_blank' ? '원본 페이지 새 창으로 이동' : '원본 페이지로 이동' : '원본에서 위치 보기';
    const action = el('span', 'card-action', actionText);
    action.append(icon(candidate.action === 'navigate' ? 'external' : 'arrow'));
    const cardTitle = items.filter(other => other.category === candidate.category).length > 1 ? candidate.label : info.title;
    item.append(image, el('span', 'card-title', cardTitle), el('span', 'card-description', info.description), el('span', 'card-source', `찾은 메뉴 · ${candidate.label}`));
    if (candidate.href && new URL(candidate.href).origin !== location.origin) {
      item.append(el('span', 'card-source', `이동할 사이트 · ${new URL(candidate.href).hostname}`));
    }
    item.append(action);
    return item;
  }

  function update(announce = false) {
    items = rank(classify(analyzePage()));
    stale = false;
    changeNotice.hidden = true;
    changeNotice.textContent = '';
    grid.replaceChildren(...items.map(card));
    if (!items.length) {
      const empty = el('div', 'empty');
      const returnButton = el('button', 'close', '원본 화면에서 찾아보기');
      returnButton.type = 'button';
      returnButton.addEventListener('click', close);
      empty.append(el('h3', '', '주요 기능을 찾지 못했어요'), el('p', '', '이 페이지의 메뉴를 원본 화면에서 확인해주세요.'), returnButton);
      grid.append(empty);
    }
    status.textContent = `${announce ? '다시 확인했어요. ' : ''}현재 페이지에서 ${items.length}개의 주요 기능을 찾았어요.`;
  }
  refresh.addEventListener('click', () => update(true));
  // 첫 분석을 끝낸 뒤 모달을 표시하여 초기 화면의 깜빡임을 줄입니다.
  update();
  dialog.showModal();
  closeButton.focus();
  stopWatching = watchCandidates(() => stale ? [] : items, markStale);
  return close;
}
