var FinalIntegration = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    analyzePage: () => analyzePage,
    areCandidatesCurrent: () => areCandidatesCurrent,
    cardSource: () => cardSource,
    classify: () => classify,
    isCandidateCurrent: () => isCandidateCurrent,
    locateOriginal: () => locateOriginal,
    openEasyMode: () => openEasyMode
  });

  // src/action-policy.ts
  var editableSignalSelector = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var downloadMarkerToken = /^(?:(?:icon|ico|ir)[-_])?download$/i;
  var downloadOperationLabel = /^(?:(?:자료|파일|문서|서식|신청서|안내서|설명서|매뉴얼|가이드)\s*)?(?:다운로드|내려\s*받기)(?:\s*하기)?$|^(?:download(?:\s+(?:the\s+)?(?:file|document|form|guide|manual))?(?:\s+now)?|(?:the\s+)?(?:file|document|form|guide|manual)\s+download(?:\s+now)?)$/i;
  var negatedDownloadTitle = /^(?:(?:do\s+not|don['’]t|no|never)\s+download(?:\s+now)?|(?:금지된|허용되지\s*않은)\s*(?:다운로드|내려\s*받기)|(?:다운로드|내려\s*받기)\s*(?:금지|불가))$/i;
  function sourceDownloadEvidence(element, safeLabel = "") {
    if (!(element instanceof HTMLAnchorElement) || !element.hasAttribute("href") || element.closest(editableSignalSelector)) return;
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (!/filedown/i.test(raw)) return;
    try {
      const url = new URL(raw, document.baseURI);
      if (!/^https?:$/.test(url.protocol) || !/(?:^|\/)filedown(?:\.do)?$/i.test(url.pathname)) return;
    } catch {
      return;
    }
    const text3 = downloadOperationLabel.test(safeLabel.normalize("NFKC").replace(/\s+/g, " ").trim());
    const icons = [];
    const addIcon = (icon2) => {
      if (icon2.closest(`${editableSignalSelector},[data-easyweb-host]`)) return;
      const tokens = (icon2.getAttribute("class") ?? "").split(/\s+/).filter((token) => token.length <= 64 && downloadMarkerToken.test(token)).sort().slice(0, 4);
      if (tokens.length) icons.push(`${icon2.tagName.toLowerCase()}:${tokens.join(" ")}`);
    };
    addIcon(element);
    for (const icon2 of element.querySelectorAll('i[class*="download" i],svg[class*="download" i],img[class*="download" i],span[class*="download" i]')) {
      addIcon(icon2);
      if (icons.length === 8) break;
    }
    return text3 || icons.length ? { text: text3, icons } : void 0;
  }
  function isDocumentDownload(element, safeLabel = "") {
    if (!(element instanceof HTMLAnchorElement) || !element.hasAttribute("href")) return false;
    const title = (element.getAttribute("title") ?? "").trim();
    const titleDownload = /(?:^|\s)(?:다운로드|download)$/i.test(title) && !negatedDownloadTitle.test(title.normalize("NFKC").replace(/\s+/g, " "));
    return element.hasAttribute("download") || titleDownload || /\.(?:pdf|hwp|hwpx|docx?|xlsx?|pptx?|odt|rtf)$/i.test(safeLabel.trim()) || !!sourceDownloadEvidence(element, safeLabel);
  }
  function sourceAction(element, safeLabel = "") {
    const locate = { action: "locate" };
    if (!(element instanceof HTMLAnchorElement) || element.isContentEditable) return locate;
    if (isDocumentDownload(element, safeLabel)) return locate;
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (!raw || raw.startsWith("#") || element.matches('[role~="button"], [aria-controls], [aria-haspopup], [download], [onclick], [data-popup-type], [data-toggle], [data-target]')) return locate;
    if (/(?:^|\s)(?:js[-_]?)?popup(?:[-_]open)?(?:\s|$)|(?:^|\s)js[-_]popup[-_]open(?:\s|$)/i.test(element.className)) return locate;
    try {
      const url = new URL(raw, document.baseURI);
      if (!/^https?:$/.test(url.protocol)) return locate;
      if (/\.(?:exe|msi|dmg|pkg|zip|7z|rar|apk|crx)$/i.test(url.pathname)) return locate;
      if (/(?:^|\/)(?:fileDownload|downloadFile|file-download|download)(?:\/|$)/i.test(url.pathname)) return locate;
      const localFragment = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !!url.hash;
      if (localFragment || /(?:^|[\/_.-])(?:sso|oauth2?|saml|authorize)(?:[\/_.-]|$)/i.test(url.pathname)) return locate;
      const target = (element.getAttribute("target") ?? document.querySelector("base[target]")?.getAttribute("target") ?? "_self").toLowerCase();
      if (!["_self", "_blank", "_top", "_parent", ""].includes(target)) return locate;
      return { action: "navigate", href: url.href, target: target || "_self" };
    } catch {
      return locate;
    }
  }

  // src/navigation-utility.ts
  var editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var form = 'form,[role~="form" i]';
  var listSelector = 'ul,ol,[role~="list" i],[role~="menu" i]';
  var itemSelector = 'li,[role~="listitem" i],[role~="menuitem" i]';
  var regionSelector = 'main,section,article,aside,header,footer,nav,[role~="main" i],[role~="region" i],[role~="navigation" i]';
  var headingSelector = ':is(h1,h2,h3,h4,h5,h6,[role~="heading" i])';
  var breadcrumbName = /^(?:breadcrumbs?(?:\s+(?:trail|navigation))?|브레드\s*크럼|현재\s*(?:위치(?:\s*안내)?|경로)|사이트\s*경로)$/i;
  var breadcrumbClass = /^(?:breadcrumbs?|breadcrumb[-_]nav(?:igation)?|breadcrumb[-_]trail|krds-breadcrumb-wrap)$/i;
  var noOpScript = /^javascript:\s*(?:;|void\s*\(\s*0\s*\)\s*;?)?$/i;
  function createNavigationCache() {
    return { controls: /* @__PURE__ */ new WeakMap(), items: /* @__PURE__ */ new WeakMap(), menus: /* @__PURE__ */ new WeakMap(), breadcrumbs: /* @__PURE__ */ new WeakMap(), targets: /* @__PURE__ */ new Map(), visibility: /* @__PURE__ */ new WeakMap() };
  }
  function visibleSource(element, cache) {
    const known = cache?.visibility.get(element);
    if (known !== void 0) return known;
    const visible = element.isConnected && !element.closest('[hidden],[inert],[aria-hidden="true" i],[aria-disabled="true" i]') && !!element.getClientRects().length && getComputedStyle(element).visibility !== "hidden";
    cache?.visibility.set(element, visible);
    return visible;
  }
  function uniqueTarget(id, cache) {
    if (!id || id.length > 128) return;
    if (cache?.targets.has(id)) return cache.targets.get(id);
    const nodes = document.querySelectorAll(`#${CSS.escape(id)}`);
    const target = nodes.length === 1 && nodes[0] instanceof HTMLElement ? nodes[0] : void 0;
    cache?.targets.set(id, target);
    return target;
  }
  function fragmentTarget(element, cache) {
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (!raw.startsWith("#") || raw.length < 2) return;
    try {
      return uniqueTarget(decodeURIComponent(raw.slice(1)), cache);
    } catch {
      return;
    }
  }
  function directItems(list, cache) {
    const known = cache?.items.get(list);
    if (known) return known;
    if (!list.matches(listSelector) || list.matches('[role~="tabpanel" i],[role~="listbox" i]') || !list.childElementCount || list.childElementCount > 24) {
      cache?.items.set(list, []);
      return [];
    }
    const children = [...list.children];
    const items = children.every((child) => child instanceof HTMLElement && child.matches(itemSelector)) ? children : [];
    cache?.items.set(list, items);
    return items;
  }
  function menuList(list, cache) {
    const known = cache?.menus.get(list);
    if (known !== void 0) return known;
    const menu = inspectMenuList(list, cache);
    cache?.menus.set(list, menu);
    return menu;
  }
  function inspectMenuList(list, cache) {
    if (list.closest(`${editable},${form},article,[role~="article" i]`) || list.querySelector(`${editable},${form}`)) return false;
    const items = directItems(list, cache);
    return items.length > 0 && items.every((item) => item.matches('a[href],button,[role~="button" i]') || !!item.querySelector(':scope > a[href],:scope > button,:scope > [role~="button" i],:scope > div > a[href]'));
  }
  function breadcrumb(element, cache) {
    const list = element.closest('ol,ul,[role~="list" i]');
    if (!list) return false;
    const items = directItems(list, cache);
    if (!items.length || items.length > 12 || element.closest(itemSelector)?.parentElement !== list) return false;
    const known = cache?.breadcrumbs.get(list);
    if (known !== void 0) return known;
    const isBreadcrumb = breadcrumbList(list, items.length);
    cache?.breadcrumbs.set(list, isBreadcrumb);
    return isBreadcrumb;
  }
  function breadcrumbList(list, itemCount) {
    for (let container = list, level = 0; container && level < 4; container = container.parentElement, level++) {
      if (container.matches("main,section,article,body")) break;
      const navigation = container.matches('nav,[role~="navigation" i]');
      if (breadcrumbName.test(container.getAttribute("aria-label") ?? "") && (navigation || container === list)) return true;
      if (navigation && itemCount >= 2 && (container.getAttribute("class") ?? "").split(/\s+/).some((token) => breadcrumbClass.test(token))) return true;
    }
    return false;
  }
  function skipKind(label) {
    if (/^(?:본문(?:\s*내용)?|주요\s*(?:내용|콘텐츠)|콘텐츠)(?:\s*(?:으로|로))?\s*(?:바로\s*가기|이동|건너\s*뛰기)$/.test(label) || /^(?:(?:skip|jump|go)(?:\s+directly)?\s+to\s+(?:the\s+)?(?:main\s+)?content|skip\s+(?:the\s+)?navigation)$/i.test(label)) return "content";
    if (/^(?:메뉴|주\s*메뉴|대\s*메뉴|주요\s*메뉴|메인\s*메뉴|내비게이션|네비게이션)(?:\s*(?:으로|로))?\s*(?:바로\s*가기|이동|건너\s*뛰기)$/.test(label) || /^(?:skip|jump|go)(?:\s+directly)?\s+to\s+(?:the\s+)?(?:main\s+)?(?:navigation|menu)$/i.test(label)) return "navigation";
  }
  function skipTarget(target, kind, cache) {
    if (!visibleSource(target, cache) || target.closest(`${editable},${form}`) || target.matches('a,button,[role~="button" i],[role~="tab" i],[role~="tabpanel" i]')) return false;
    if (kind === "content" && target.matches('main,[role~="main" i]') || kind === "navigation" && target.matches('nav,[role~="navigation" i]')) return true;
    if (!target.matches("div,section,ul,ol")) return false;
    if (kind === "content") return !!target.querySelector(`:scope > ${headingSelector},:scope > div > ${headingSelector}`);
    return menuList(target, cache) || [...target.querySelectorAll(":scope > ul,:scope > ol,:scope > div > ul,:scope > div > ol")].some((list) => menuList(list, cache));
  }
  function locallyControlled(element, cache) {
    const ids = (element.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    if (ids.length !== 1) return;
    const target = uniqueTarget(ids[0], cache);
    if (!target || target === element || element.contains(target) || element.closest(regionSelector) !== target.closest(regionSelector)) return;
    const parent = element.parentElement;
    return parent && parent !== document.body && (target.parentElement === parent || !!element.closest(itemSelector)?.contains(target)) ? target : void 0;
  }
  function navigationUtility(element, label, cache) {
    const known = cache?.controls.get(element);
    if (known?.label === label) return known.utility;
    const utility2 = inspectNavigationUtility(element, label, cache);
    cache?.controls.set(element, { label, utility: utility2 });
    return utility2;
  }
  function inspectNavigationUtility(element, label, cache) {
    if (!element.matches('a[href],button,[role~="button" i]') || !visibleSource(element, cache) || element.closest(`${editable},${form}`) || element.querySelector(editable) || element instanceof HTMLButtonElement && !!element.form) return;
    const name2 = label.normalize("NFKC").replace(/\s+/g, " ").trim();
    if (!name2 || name2.length > 100) return;
    const anchor = element instanceof HTMLAnchorElement;
    if (anchor) {
      if ((element.getAttribute("rel") ?? "").split(/\s+/).some((token) => token.toLowerCase() === "home") || breadcrumb(element, cache)) return "position";
      const kind = skipKind(name2), target = kind ? fragmentTarget(element, cache) : void 0;
      if (kind && target && skipTarget(target, kind, cache)) return "position";
    }
    if (element.matches('[role~="tab" i]') || element.closest('dl,[role~="tabpanel" i]') || /[?？]$/.test(name2)) return;
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (anchor && raw && !raw.startsWith("#") && !/^javascript:/i.test(raw)) return;
    const expanded = /^(?:true|false)$/i.test(element.getAttribute("aria-expanded") ?? "");
    const popup = element.getAttribute("aria-haspopup")?.toLowerCase();
    if (popup && popup !== "menu" && popup !== "true") return;
    const controls3 = element.hasAttribute("aria-controls");
    if (controls3) {
      const target = locallyControlled(element, cache);
      return expanded && target && menuList(target, cache) ? "branch" : void 0;
    }
    if (expanded && raw.startsWith("#") && raw.length > 1) {
      const target = fragmentTarget(element, cache);
      return target && target.parentElement === element.parentElement && menuList(target, cache) ? "branch" : void 0;
    }
    const item = element.closest(itemSelector);
    const direct = item && (element.parentElement === item || element.parentElement?.parentElement === item) ? item.querySelector(`:scope > :is(${listSelector})`) : null;
    if (direct && menuList(direct, cache) && anchor && (raw === "#" || noOpScript.test(raw))) return "branch";
    const sibling = element.nextElementSibling;
    if (expanded && sibling instanceof HTMLElement && menuList(sibling, cache) && (popup === "menu" || popup === "true" || !!element.closest('nav,[role~="navigation" i]'))) return "branch";
  }

  // src/analyzer.ts
  var clean = (text3) => text3.replace(/\s+/g, " ").trim().slice(0, 140);
  var editableRoleSelector = ["textbox", "searchbox", "combobox", "spinbutton", "slider"].map((role) => `[role~="${role}" i]`).join(", ");
  var editableSelector = `input, textarea, select, [contenteditable]:not([contenteditable="false" i]), ${editableRoleSelector}`;
  var headingSelector2 = ':is(h1,h2,h3,h4,h5,h6,[role~="heading" i])';
  var localRegionSelector = 'section, article, aside, [role~="region" i], [role~="article" i], [role~="complementary" i]';
  var informationConcept = /(?:행동\s*요령|안전\s*수칙|대처\s*(?:방법|요령)|이용\s*(?:안내|방법)|사용\s*설명서|instructions?|(?:action|safety)\s+tips?)(?:\s*(?:안내|모음))?$/i;
  var helpHeading = /^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A|도움말|Help)$/i;
  var collectionSelector = 'ul, ol, [role~="list" i], [role~="tablist" i]';
  var collectionControlSelector = 'a[href], button, [role~="button" i], [role~="tab" i]';
  var collectionExcludedSelector = 'header, footer, article, form, [role~="banner" i], [role~="contentinfo" i], [role~="article" i], [role~="form" i]';
  var topicUtility = /^(?:전체|이전|다음|처음|마지막|확인|취소|닫기|뒤로|더\s*보기|바로\s*가기|자세히\s*보기|공유(?:하기)?|인쇄(?:하기)?|프린트|화면\s*(?:확대|축소)|previous|next|first|last|ok|cancel|close|back|more|open|share|print|zoom\s*(?:in|out)|\d+)$/i;
  var informationFacet = /(?:특징|종류|조건|기준|절차|방법|제도)(?:\s*안내)?$/;
  function isInformationTopicLabel(label) {
    const text3 = label.normalize("NFKC").replace(/\s+/g, " ").trim();
    return text3.length >= 2 && text3.length <= 36 && !/[.!?。？]/.test(text3) && !topicUtility.test(text3);
  }
  function isVisible(element) {
    if (!element.isConnected || element.closest('[hidden], [inert], [aria-hidden="true" i], [aria-disabled="true" i]')) return false;
    if (element.closest("[data-easyweb-host], [data-easyweb-notice]")) return false;
    if (!element.getClientRects().length) return false;
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    }
    return !element.matches(':disabled, [aria-disabled="true" i]');
  }
  function isEditable(element) {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || element instanceof HTMLElement && element.isContentEditable || element.matches(editableRoleSelector);
  }
  function staticText(node) {
    if (node instanceof Element && (isEditable(node) || node.closest(editableSelector) || node.matches("script, style, noscript, template, [data-easyweb-host]"))) return "";
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
    const parts = [];
    for (const child of node.childNodes) parts.push(staticText(child));
    return parts.join(" ");
  }
  function getSafeLabel(element) {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label2 = labelledBy.split(/\s+/).map((id) => {
        const target = document.getElementById(id);
        return target ? staticText(target) : "";
      }).join(" ");
      if (clean(label2)) return clean(label2);
    }
    const label = element.getAttribute("aria-label");
    if (label) return clean(label);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      const labels = [...element.labels ?? []].map(staticText).join(" ");
      if (clean(labels)) return clean(labels);
    }
    const title = clean(element.getAttribute("title") ?? "");
    if (element instanceof HTMLInputElement) {
      return ["button", "submit"].includes(element.type) ? clean(element.getAttribute("value") ?? "") || title : title || clean(element.getAttribute("placeholder") ?? "");
    }
    if (isEditable(element)) return title || clean(element.getAttribute("placeholder") ?? "");
    const text3 = clean(staticText(element));
    if (text3) return text3;
    const image = [...element.querySelectorAll("img")].find((img) => !img.closest(editableSelector));
    return clean(image?.getAttribute("alt") ?? "") || title;
  }
  function candidateLabel(element) {
    if (!isVisible(element) || element.parentElement?.closest(editableSelector)) return "";
    if (element.isContentEditable && element.matches('a, button, [role~="button"]')) return "";
    if (element instanceof HTMLInputElement && !["search", "text", "submit", "button"].includes(element.type)) return "";
    const textInput = isEditable(element) && !element.matches('input[type="submit"], input[type="button"]');
    const label = getSafeLabel(element);
    const searchControl = isSearchControl(element, label);
    if (textInput && !searchControl) return "";
    const safe = label || (textInput && searchControl ? "\uAC80\uC0C9" : "");
    return safe.length <= 100 ? safe : "";
  }
  function isSearchControl(element, label = getSafeLabel(element)) {
    const searchCue = (text3) => /검색|\bsearch\b/i.test(text3.normalize("NFKC").replace(/[_-]+/g, " "));
    const textual = element instanceof HTMLInputElement && ["text", "search"].includes(element.type) || element instanceof HTMLTextAreaElement || element.isContentEditable || element.matches('[role~="textbox" i], [role~="searchbox" i]');
    return textual && (element.matches('input[type="search"], [role~="searchbox" i]') || !!element.closest('[role~="search"], search') || searchCue(label) || searchCue(element.getAttribute("placeholder") ?? ""));
  }
  function headingBelongsTo(heading2, element) {
    const region = heading2.closest(localRegionSelector);
    if (!region || region.contains(element)) return true;
    if (element.closest(localRegionSelector) || !region.matches("section")) return false;
    const onlyHeading = (node) => {
      if (node === heading2) return true;
      if (node.nodeType === Node.TEXT_NODE) return !(node.nodeValue ?? "").trim();
      if (!(node instanceof Element)) return true;
      return node.contains(heading2) && [...node.childNodes].every(onlyHeading);
    };
    return onlyHeading(region);
  }
  function contextLabels(element, cache) {
    const labels = [];
    const add = (text3) => {
      if (text3 && text3.length <= 60 && !labels.includes(text3)) labels.push(text3);
    };
    let parent = element.parentElement;
    for (let level = 0; parent && parent !== document.body && level < 10; level++, parent = parent.parentElement) {
      let summary = cache?.get(parent);
      if (!summary) {
        summary = { headings: [...parent.querySelectorAll(`:scope > ${headingSelector2}, :scope > :is(div,section) > ${headingSelector2}, :scope > :is(div,section) > :is(div,section) > ${headingSelector2}`)].map((heading2) => ({ element: heading2, label: clean(getSafeLabel(heading2)), visible: isVisible(heading2) })) };
        cache?.set(parent, summary);
      }
      const preceding = summary.headings.filter(({ element: heading2, visible }) => {
        let branch = heading2;
        while (branch.parentElement && branch.parentElement !== parent) branch = branch.parentElement;
        if (branch !== heading2 && branch.contains(element)) return false;
        return !heading2.closest('header, nav, footer, [role~="banner"], [role~="navigation"], [role~="contentinfo"]') && visible && headingBelongsTo(heading2, element) && !!(heading2.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      const label = preceding.at(-1);
      if (label) add(label.label);
      if (!label && level < 2) {
        if (summary.paragraph === void 0) {
          const paragraph2 = parent.querySelector(":scope > p");
          const visible = !!paragraph2 && parent.querySelectorAll("a, button, input").length <= 3 && isVisible(paragraph2);
          summary.paragraph = paragraph2 && visible ? { element: paragraph2, label: clean(staticText(paragraph2)), visible } : null;
        }
        const paragraph = summary.paragraph;
        if (paragraph?.visible && paragraph.element.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
          if (paragraph.label && paragraph.label.length <= 40) add(paragraph.label);
        }
      }
      if (labels.length >= 3) break;
    }
    return labels;
  }
  function documentPurpose() {
    if (/(?:^|[\/_.-])academic[-_]?calendar(?:[\/_.-]|$)/i.test(location.pathname)) return "academic-calendar";
    if (/(?:^|[\/_.-])(?:faq|qna|qa|help|answerquestions)(?:[\/_.-]|$)/i.test(location.pathname)) return "help";
    const words = (location.pathname.split("/").at(-1) ?? "").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
    if (words.some((word) => /^(?:instruction|instructions)$/.test(word)) || words.some((word, index) => word === "action" && /^tips?$/.test(words[index + 1] ?? ""))) return "help";
    const headings5 = document.querySelectorAll(`main > ${headingSelector2}, [role~="main"] > ${headingSelector2}, .page-title > ${headingSelector2}`);
    for (const heading2 of headings5) {
      if (!isVisible(heading2)) continue;
      const text3 = clean(getSafeLabel(heading2));
      if (text3.length > 60) continue;
      if (/학사\s*일정|academic\s+calendar/i.test(text3)) return "academic-calendar";
      if (helpHeading.test(text3) || informationConcept.test(text3)) return "help";
    }
    return void 0;
  }
  function pagePurpose(element, labels = contextLabels(element), common = documentPurpose()) {
    if (common) return common;
    if (labels.some((text3) => helpHeading.test(text3) || informationConcept.test(text3))) return "help";
    const region = element.closest('main, [role~="main"], section, [role~="region"]');
    if (region) for (const link of region.querySelectorAll(':scope > nav a, :scope > [role~="navigation"] a')) {
      if (!isVisible(link)) continue;
      if (/^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A)$/i.test(clean(staticText(link)))) return "help";
    }
    return void 0;
  }
  function sourceContext(element) {
    return element.closest('footer, [role~="contentinfo"]') ? "footer" : element.closest('header, nav, [role~="navigation"], [role~="banner"]') ? "primary" : "body";
  }
  function isQuestionCollection(element) {
    const marked = (control2) => !![...control2.querySelectorAll(":scope > abbr[title]")].find((marker) => /^(?:질문|question)$/i.test((marker.getAttribute("title") ?? "").trim()) && isVisible(marker));
    if (!marked(element) || !element.matches('a, button, [role~="button"]') || candidateLabel(element).length < 4) return false;
    const list = element.closest('ul, ol, [role~="list"]');
    if (!list) return false;
    let count = 0;
    for (const row of list.querySelectorAll(':scope > li, :scope > [role~="listitem"]')) {
      const control2 = row.querySelector(':scope > a, :scope > button, :scope > [role~="button"]');
      if (control2 && marked(control2) && candidateLabel(control2).length >= 4 && ++count >= 2) return true;
    }
    return false;
  }
  function collectionEvidence(element, cache) {
    const empty = { kind: void 0, peers: 0, informationPeer: false, controlled: false, targetExists: false };
    if (element.closest(collectionExcludedSelector)) return empty;
    const container = element.closest(collectionSelector);
    if (!container) return empty;
    const tabs = container.matches('[role~="tablist" i]');
    const row = element.closest('li, [role~="listitem" i]');
    if (!(tabs ? element.matches('[role~="tab" i]') : row?.parentElement === container)) return empty;
    let summary = cache?.get(container);
    if (!summary) {
      const eligible = (peer) => !peer.closest(collectionExcludedSelector) && !((peer instanceof HTMLButtonElement || peer instanceof HTMLInputElement) && peer.form) && isInformationTopicLabel(candidateLabel(peer));
      const controls3 = tabs ? [...container.querySelectorAll('[role~="tab" i]')].filter((peer) => peer.closest(collectionSelector) === container && eligible(peer)) : [...container.querySelectorAll(':scope > li, :scope > [role~="listitem" i]')].flatMap((item) => {
        const control2 = [...item.querySelectorAll(collectionControlSelector)].find((peer) => peer.closest(collectionSelector) === container && eligible(peer));
        return control2 ? [control2] : [];
      });
      let peers = 0;
      let informationPeer = false;
      let facets = 0;
      for (const peer of controls3) {
        const label = candidateLabel(peer);
        if (!label) continue;
        peers = Math.min(2, peers + 1);
        if (label.length <= 40 && (helpHeading.test(label) || informationConcept.test(label))) informationPeer = true;
        if (informationFacet.test(label)) facets++;
      }
      informationPeer ||= facets >= 2;
      summary = { peers, informationPeer };
      cache?.set(container, summary);
    }
    const references = (element.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    const targetExists = references.length > 0 && references.every((id) => !!document.getElementById(id));
    const raw = element.getAttribute("href")?.trim() ?? "";
    const controlled = element.matches('button, [role~="button" i], [role~="tab" i]') || targetExists || /^#.+|^javascript:\s*\S/i.test(raw) || element.hasAttribute("onclick") || /^(?:true|false)$/i.test(element.getAttribute("aria-expanded") ?? "");
    return { kind: tabs ? "tabs" : "list", ...summary, controlled, targetExists };
  }
  var contentBoundarySelector = 'section,article,aside,nav,form,header,footer,[role~="region" i],[role~="article" i],[role~="complementary" i],[role~="navigation" i],[role~="form" i],[role~="banner" i],[role~="contentinfo" i]';
  function withinContentBranch(node, container) {
    const boundary = node.closest(contentBoundarySelector);
    return !boundary || boundary === container || !container.contains(boundary);
  }
  function fixedHeadingLabels(container) {
    return [
      ...container instanceof HTMLElement && container.matches(headingSelector2) ? [container] : [],
      ...container.querySelectorAll(headingSelector2)
    ].filter((heading2) => !heading2.closest(`${editableSelector},a,button,[role~="button" i],[role~="tab" i]`) && withinContentBranch(heading2, container) && isVisible(heading2)).map(getSafeLabel).filter((text3) => text3.length >= 2 && text3.length <= 60);
  }
  function followingContentHeadings(container, cache) {
    let branch = container;
    for (let depth = 0; depth <= 3; depth++) {
      const next = branch.nextElementSibling;
      if (next) {
        return !next.matches(`${contentBoundarySelector},a,button,[role~="button" i],[role~="tab" i]`) && next.childElementCount <= 12 ? fixedHeadingLabels(next) : [];
      }
      const parent = branch.parentElement;
      if (!parent?.matches("div") || parent.matches("[role]") || parent.childElementCount > 12) break;
      const outside2 = [...parent.children].filter((child) => child !== branch);
      if (outside2.some((child) => child.matches(contentBoundarySelector) || child.querySelector(contentBoundarySelector) || child.matches(editableSelector) || child.querySelector(editableSelector))) break;
      let summary = cache?.get(parent);
      if (!summary?.wrapperControls) {
        summary = { ...summary, wrapperControls: [...parent.querySelectorAll(collectionControlSelector)] };
        cache?.set(parent, summary);
      }
      if (summary.wrapperControls.some((control2) => !branch.contains(control2))) break;
      branch = parent;
    }
    return [];
  }
  function cardTitle(element, cache) {
    if (element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby")) return {};
    const fixedTitles2 = (container) => [...container.querySelectorAll(`${headingSelector2},strong,b`)].filter((node) => !node.closest(editableSelector) && withinContentBranch(node, container) && isVisible(node)).filter((node) => !node.parentElement?.closest(`${headingSelector2},strong,b`)).map((node) => ({ node, label: clean(staticText(node)) })).filter(({ label }) => isInformationTopicLabel(label));
    const titles = fixedTitles2(element);
    if (titles.length === 1 && !element.querySelector(collectionControlSelector)) {
      const { node, label } = titles[0];
      const description = [...element.querySelectorAll("p,div,dl,ul")].some((block) => !block.contains(node) && !block.closest(editableSelector) && isVisible(block) && !!clean(staticText(block)) && !!(node.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (description) return { title: label };
    }
    if (!/^(?:더\s*보기|자세히\s*보기|상세\s*보기|more|read\s*more|details?|view\s*details?)$/i.test(candidateLabel(element))) return {};
    for (let parent = element.parentElement, depth = 0; parent && depth < 3; depth++, parent = parent.parentElement) {
      if (parent.matches(`html,body,main,[role~="main" i],${contentBoundarySelector}`) || parent.childElementCount > 12) break;
      let summary = cache?.get(parent);
      if (!summary?.cardControls) {
        summary = { ...summary, cardControls: [...parent.querySelectorAll(collectionControlSelector)].filter((control2) => !!candidateLabel(control2)) };
        cache?.set(parent, summary);
      }
      if (summary.cardControls.length !== 1 || summary.cardControls[0] !== element) break;
      const neighbours = fixedTitles2(parent).filter(({ node }) => !element.contains(node) && !!(node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (neighbours.length === 1) return { title: neighbours[0].label, relatedLabel: neighbours[0].label };
    }
    return {};
  }
  function topicEvidence(element, cache) {
    const empty = {
      topicPeers: 0,
      controlledTopic: false,
      linkedTopic: false,
      associatedHeadings: [],
      collectionPeers: []
    };
    if (!isInformationTopicLabel(candidateLabel(element))) return empty;
    const references = (control2) => (control2.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    const contentTarget = (control2, id) => {
      const target = document.getElementById(id);
      if (!target || target === control2 || target.closest(editableSelector) || target.matches('html,body,main,[role~="main" i],a,button,[role~="button" i],[role~="tab" i]') || target.closest('article,aside,form,header,footer,nav,[role~="article" i],[role~="complementary" i],[role~="form" i],[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i]') || target.closest('main,[role~="main" i]') !== control2.closest('main,[role~="main" i]')) return;
      return target;
    };
    const controlsTarget = (control2) => {
      const ids = references(control2);
      return ids.length > 0 && ids.every((id) => !!contentTarget(control2, id));
    };
    const expanded = (control2) => /^(?:true|false)$/i.test(control2.getAttribute("aria-expanded") ?? "");
    const semanticCollection = element.closest(collectionSelector);
    let container = semanticCollection;
    if (!container) {
      container = element.parentElement;
      if (container?.matches('[role~="group" i]') && container.parentElement) container = container.parentElement;
    }
    if (!container || container.matches("body,main,section,article,form,header,footer") || container.childElementCount > 24) return empty;
    let summary = cache?.get(container);
    if (!summary?.topicControls) {
      const controls4 = [...container.querySelectorAll(collectionControlSelector)].filter((control2) => !control2.closest(collectionExcludedSelector) && !(control2 instanceof HTMLButtonElement && control2.form) && isInformationTopicLabel(candidateLabel(control2)) && (semanticCollection ? control2.closest(collectionSelector) === container : control2.parentElement === container || control2.parentElement?.parentElement === container));
      summary = { ...summary, topicControls: controls4 };
      cache?.set(container, summary);
    }
    const controls3 = summary.topicControls;
    if (controls3.length < 2 || controls3.length > 12 || !controls3.includes(element)) return empty;
    if (!summary.followingHeadings) {
      const headings5 = followingContentHeadings(container, cache);
      summary = { ...summary, followingHeadings: headings5 };
      cache?.set(container, summary);
    }
    const associatedHeadings = [...summary.followingHeadings];
    for (const id of references(element)) {
      const target = contentTarget(element, id);
      if (target && target.childElementCount <= 24) {
        for (const label of fixedHeadingLabels(target)) if (!associatedHeadings.includes(label)) associatedHeadings.push(label);
      }
    }
    const controlledTopic = controlsTarget(element) && controls3.filter(controlsTarget).length >= 2 || expanded(element) && controls3.filter(expanded).length >= 2 || element.matches('[role~="tab" i]') && !!semanticCollection?.matches('[role~="tablist" i]') || !!element.closest('[role~="group" i]') && controls3.every((control2) => !!control2.closest('[role~="group" i]'));
    const linkedTopic = controlsTarget(element) || element.matches('[role~="tab" i]') && !!semanticCollection?.matches('[role~="tablist" i]');
    const localParent = container.parentElement;
    const outsideCollection = localParent?.matches("div") ? [...localParent.children].filter((child) => child !== container) : [];
    const isolatedCollection = !outsideCollection.some((child) => child.matches(`${contentBoundarySelector},${editableSelector},${collectionControlSelector}`) || child.querySelector(`${contentBoundarySelector},${editableSelector},${collectionControlSelector}`));
    const collectionPeers = semanticCollection && isolatedCollection && !container.querySelector(`form,[role~="form" i],${editableSelector}`) ? controls3.map((control2) => ({ label: candidateLabel(control2), ...sourceAction(control2, candidateLabel(control2)), isLink: control2.matches("a[href]") })) : [];
    return { topicPeers: Math.min(controls3.length, 2), controlledTopic, linkedTopic, associatedHeadings, collectionPeers };
  }
  var preparationNodeIds = /* @__PURE__ */ new WeakMap();
  var nextPreparationNodeId = 1;
  function preparationNodeId(element) {
    let id = preparationNodeIds.get(element);
    if (!id) {
      id = nextPreparationNodeId++;
      preparationNodeIds.set(element, id);
    }
    return id;
  }
  function fixedPreparationName(element, limit) {
    if (!isVisible(element) || element.closest(editableSelector) || element.querySelector(editableSelector) || element.hasAttribute("aria-labelledby")) return "";
    const children = [...element.querySelectorAll("*")];
    if (children.length > 16 || children.some((child) => child.matches("script,style,iframe") || !!clean(staticText(child)) && !isVisible(child))) return "";
    const text3 = clean(getSafeLabel(element));
    return text3.length <= limit ? text3 : "";
  }
  function preparationDocumentTitle(text3) {
    if (text3.length < 2 || text3.length > 90) return false;
    const start = text3.search(/[([（]/);
    let core = text3;
    if (start >= 0) {
      core = text3.slice(0, start).trim();
      const pairs = { "(": ")", "[": "]", "\uFF08": "\uFF09" };
      const expected = [];
      for (const char of text3.slice(start)) {
        if (pairs[char]) {
          expected.push(pairs[char]);
          if (expected.length > 2) return false;
        } else if (/[)\]）]/.test(char)) {
          if (expected.pop() !== char) return false;
        } else if (!expected.length && char.trim()) return false;
      }
      if (expected.length) return false;
    }
    return !/[.!?。？]/.test(core) && /(?:신청서|신고서|청구서|위임장|동의서|\b(?:application|declaration|claim|authorization|consent)\s+form)$/i.test(core);
  }
  function preparationPurposeName(text3) {
    return !!text3 && text3.length <= 120 && /서식|신청서|신고서|청구서|\b(?:application|declaration|claim|authorization|consent)\s+forms?\b/i.test(text3) && !/뉴스|보도|소프트웨어|설치\s*프로그램|보고서|\b(?:news|software|installers?|reports?|archives?)\b/i.test(text3);
  }
  function preparationPurpose(table) {
    if (table.caption) return preparationPurposeName(fixedPreparationName(table.caption, 120)) ? table.caption : void 0;
    let parent = table.parentElement;
    for (let level = 0; parent && parent !== document.body && level < 6; level++, parent = parent.parentElement) {
      if (parent.matches('article,aside,nav,header,footer,[role~="article" i],[role~="navigation" i],[role~="banner" i],[role~="contentinfo" i]')) break;
      const headings5 = [...parent.querySelectorAll(`:scope > ${headingSelector2}, :scope > div > ${headingSelector2}`)];
      const heading2 = headings5.filter((node) => headingBelongsTo(node, table) && !!(node.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);
      if (heading2) return preparationPurposeName(fixedPreparationName(heading2, 120)) ? heading2 : void 0;
      if (parent.matches('main,section,[role~="main" i],[role~="region" i]')) break;
    }
  }
  function preparationDownloadMarker(element, name2) {
    const file = /\.(?:pdf|hwp|hwpx|docx?|zip)$/i;
    const operation2 = /^(?:pdf|hwp|hwpx|docx?|zip)\s*(?:파일\s*|file\s*)?(?:다운로드|내려\s*받기|download)$/i;
    if (file.test(name2) || operation2.test(name2) || operation2.test(element.getAttribute("title") ?? "") || file.test(element.getAttribute("download") ?? "")) return true;
    try {
      return file.test(new URL(element.getAttribute("href") ?? "", document.baseURI).pathname);
    } catch {
      return false;
    }
  }
  function preparationAttachmentEvidence(element, cache) {
    if (!(element instanceof HTMLAnchorElement) || !element.hasAttribute("href") || element.closest('article,aside,nav,header,footer,[role~="article" i],[role~="complementary" i],[role~="navigation" i],[role~="banner" i],[role~="contentinfo" i]')) return;
    const row = element.closest("tr");
    const table = row?.closest("table");
    if (!(row instanceof HTMLTableRowElement) || !(table instanceof HTMLTableElement) || row.querySelector(`table,[role~="grid" i],${editableSelector}`)) return;
    const name2 = fixedPreparationName(element, 100);
    if (!name2 || sourceAction(element, name2).action !== "locate" || !preparationDownloadMarker(element, name2)) return;
    let rowSummary = cache?.get(row);
    if (!rowSummary?.preparationAttachments) {
      const attachments = /* @__PURE__ */ new Map();
      let tableSummary = cache?.get(table);
      if (tableSummary?.preparationTable === void 0) {
        const head = table.tHead;
        const headers = head?.rows.length === 1 ? [...head.rows[0].cells] : [];
        const names = headers.map((header) => fixedPreparationName(header, 40));
        const titles = names.flatMap((label, index) => /^(?:제목|민원명|사무명|서식명|title|form\s+name)$/i.test(label) ? [index] : []);
        const files = names.flatMap((label, index) => /^(?:첨부|첨부파일|서식|attachments?|files?|downloads?)$/i.test(label) ? [index] : []);
        const purpose = preparationPurpose(table);
        const valid = purpose && headers.length >= 2 && headers.length <= 12 && titles.length === 1 && files.length === 1 && headers.every((header, index) => header.matches("th") && !!names[index] && header.colSpan === 1 && header.rowSpan === 1);
        tableSummary = { ...tableSummary, preparationTable: valid ? { headers, titleIndex: titles[0], attachmentIndex: files[0], purpose } : false };
        cache?.set(table, tableSummary);
      }
      const layout = tableSummary.preparationTable;
      const cells = [...row.cells];
      if (layout && cells.length === layout.headers.length && cells.every((cell) => cell.colSpan === 1 && cell.rowSpan === 1 && isVisible(cell))) {
        const titleCell = cells[layout.titleIndex], attachmentCell = cells[layout.attachmentIndex];
        const titleControls = [...titleCell.querySelectorAll('a[href],button,[role~="button" i]')];
        const title = titleControls[0] ?? titleCell;
        const label = titleControls.length <= 1 ? fixedPreparationName(title, 90) : "";
        const sources = [...attachmentCell.querySelectorAll("a[href]")];
        if (preparationDocumentTitle(label) && fixedPreparationName(titleCell, 90) === label && sources.length <= 8) {
          const dependencies = [
            table,
            table.tHead,
            table.tHead.rows[0],
            ...layout.headers,
            ...layout.headers.flatMap((header) => [...header.querySelectorAll("*")]),
            layout.purpose,
            ...layout.purpose.querySelectorAll("*"),
            row,
            ...cells,
            title,
            ...title.querySelectorAll("*")
          ];
          for (const source of sources) {
            const fixedName4 = fixedPreparationName(source, 100);
            if (!fixedName4 || sourceAction(source, fixedName4).action !== "locate" || !preparationDownloadMarker(source, fixedName4)) continue;
            const lineage = [];
            for (const node of [source, title, layout.purpose]) {
              for (let parent = node, level = 0; parent && parent !== document.body && level < 10; parent = parent.parentElement, level++) lineage.push(parent);
            }
            const nodes = [.../* @__PURE__ */ new Set([...dependencies, ...lineage])];
            if (nodes.length <= 48) attachments.set(source, { label, nodes: nodes.map(preparationNodeId) });
          }
        }
      }
      rowSummary = { ...rowSummary, preparationAttachments: attachments };
      cache?.set(row, rowSummary);
    }
    return rowSummary.preparationAttachments.get(element);
  }
  function supplementalEvidence(element, cache) {
    const bodyControl = !element.closest('header, footer, article, [role~="banner" i], [role~="contentinfo" i], [role~="article" i]');
    const form3 = element.closest('form, [role~="form" i]') ?? (element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.form : null);
    const metadataWords = (text3) => text3.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const searchMetadata = (target) => ["id", "class"].some((name2) => metadataWords(target.getAttribute(name2) ?? "").includes("search")) || /검색|\bsearch\b/i.test(target.getAttribute("aria-label") ?? "");
    const filter = bodyControl && !!form3 && searchMetadata(form3) && searchMetadata(element) && !!element.closest('li, [role~="listitem" i]') && element.matches('a[href], button[type="button"], [role~="button" i]');
    let title;
    let cardRelatedLabel;
    if (bodyControl && !form3 && !element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby") && element.matches('a, button, [role~="button" i]')) {
      const children = [...element.children];
      const paragraph = children.findIndex((child) => child.matches("p"));
      if (paragraph === 1 && children[0] instanceof HTMLElement && children[0].matches("span, strong, b, em, h2, h3, h4, h5, h6") && isVisible(children[0]) && isVisible(children[1])) {
        const text3 = clean(staticText(children[0]));
        if (isInformationTopicLabel(text3) && clean(staticText(children[1]))) title = text3;
      }
      if (!title) ({ title, relatedLabel: cardRelatedLabel } = cardTitle(element, cache));
    }
    let materialRow = false;
    let relatedLabel = cardRelatedLabel;
    const row = bodyControl && !form3 ? element.closest('tr, [role~="row" i]') : null;
    const table = row?.closest('table, [role~="grid" i]');
    if (row && table) {
      let rowSummary = cache?.get(row);
      if (!rowSummary?.materials) {
        let tableSummary = cache?.get(table);
        if (!tableSummary?.columns) {
          const columns2 = [...table.querySelectorAll('thead th, [role~="columnheader" i]')].filter((header) => header.closest('table, [role~="grid" i]') === table).map((header) => isVisible(header) ? clean(staticText(header)) : "");
          tableSummary = { ...tableSummary, columns: columns2 };
          cache?.set(table, tableSummary);
        }
        const titleColumn = (text3) => /^(?:제목|민원명|사무명|서식명|title|form\s+name)$/i.test(text3);
        const attachmentColumn = (text3) => /^(?:첨부|서식|첨부파일|attachment|forms?)$/i.test(text3);
        const download = (control2) => /^(?:자료\s*받기|다운로드|서식\s*받기|download)$/i.test(candidateLabel(control2));
        const cells = [...row.querySelectorAll(':scope > td, :scope > th, :scope > [role~="cell" i], :scope > [role~="gridcell" i]')];
        const controls3 = [...row.querySelectorAll('a[href], button, [role~="button" i]')].filter((control2) => control2.closest('tr, [role~="row" i]') === row && !!candidateLabel(control2));
        const columns = tableSummary.columns;
        const materials = /* @__PURE__ */ new Map();
        if (columns.some(titleColumn) && columns.some(attachmentColumn)) {
          if (cells.length === columns.length) {
            const titles = cells.flatMap((cell, index) => titleColumn(columns[index]) ? controls3.filter((control2) => control2.matches("a[href]") && cell.contains(control2)).slice(0, 1) : []);
            const attachments = controls3.filter((control2) => cells.some((cell, index) => attachmentColumn(columns[index]) && cell.contains(control2)) && download(control2));
            if (titles.length && attachments.length) {
              const labels = [...new Set(titles.map(candidateLabel))];
              titles.forEach((control2) => materials.set(control2, candidateLabel(control2)));
              attachments.forEach((control2) => materials.set(control2, labels.length === 1 ? labels[0] : void 0));
            }
          }
        }
        rowSummary = { ...rowSummary, materials };
        cache?.set(row, rowSummary);
      }
      materialRow = rowSummary.materials.has(element);
      relatedLabel = rowSummary.materials.get(element);
    }
    const preparation2 = preparationAttachmentEvidence(element, cache);
    const preparationAttachment = !!preparation2;
    const preparationAttachmentNodes = preparation2?.nodes ?? [];
    if (preparation2) relatedLabel = preparation2.label;
    let informationPanels = false;
    if (bodyControl && !form3 && element.matches('button, [role~="button" i]') && /^(?:true|false)$/i.test(element.getAttribute("aria-expanded") ?? "")) {
      const parent2 = element.parentElement;
      if (!parent2) return {
        filter,
        title,
        materialRow,
        preparationAttachment,
        preparationAttachmentNodes,
        relatedLabel,
        informationPanels: false,
        grouped: false,
        topicPeers: 0,
        controlledTopic: false,
        linkedTopic: false,
        associatedHeadings: [],
        collectionPeers: []
      };
      let summary = cache?.get(parent2);
      if (!summary?.panels) {
        const controls3 = [...parent2.children].filter((child) => child instanceof HTMLElement && child.matches('button, [role~="button" i]') && /^(?:true|false)$/i.test(child.getAttribute("aria-expanded") ?? "") && !(child instanceof HTMLButtonElement && child.form) && isInformationTopicLabel(candidateLabel(child)));
        const panels = controls3.length >= 2 && controls3.filter((control2) => /(?:안내|절차|방법|예시|기준|종류)$/.test(candidateLabel(control2))).length >= 2 ? new Set(controls3) : /* @__PURE__ */ new Set();
        summary = { ...summary, panels };
        cache?.set(parent2, summary);
      }
      informationPanels = summary.panels.has(element);
    }
    let grouped = false;
    const group = bodyControl && !form3 ? element.closest('[role~="group" i]') : null;
    const parent = group?.parentElement;
    if (parent) {
      let summary = cache?.get(parent);
      if (!summary?.groups) {
        const controls3 = [...parent.children].filter((child) => child.matches('[role~="group" i]')).flatMap((child) => {
          const groupControls = [...child.querySelectorAll('a[href], button, [role~="button" i]')].filter((control2) => !control2.closest('form, [role~="form" i]') && !(control2 instanceof HTMLButtonElement && control2.form) && !!candidateLabel(control2));
          return groupControls.length === 1 ? groupControls : [];
        });
        summary = { ...summary, groups: controls3.length >= 2 ? new Set(controls3) : /* @__PURE__ */ new Set() };
        cache?.set(parent, summary);
      }
      grouped = summary.groups.has(element);
    }
    const topics = bodyControl && !form3 ? topicEvidence(element, cache) : { topicPeers: 0, controlledTopic: false, linkedTopic: false, associatedHeadings: [], collectionPeers: [] };
    return { filter, title, materialRow, preparationAttachment, preparationAttachmentNodes, relatedLabel, informationPanels, grouped, ...topics };
  }
  function sourceSnapshot(element, safeLabel = candidateLabel(element), collectionCache, includeCollection = false, includeSupplemental = false, supplementalCache, navigationCache) {
    return {
      pageUrl: location.href,
      baseUrl: document.baseURI,
      attributes: JSON.stringify([
        ...["href", "target", "onclick", "aria-controls", "aria-current", "aria-expanded", "download", "type", "form", "role", "title", "placeholder", "contenteditable"].map((name2) => element.getAttribute(name2)),
        element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? [
          element.type,
          !!element.form,
          element.form ? ["action", "method", "onsubmit"].map((name2) => element.form.getAttribute(name2)) : null
        ] : null,
        document.querySelector("base[target]")?.getAttribute("target"),
        [...element.querySelectorAll(":scope > abbr")].map((marker) => [marker.getAttribute("title"), isVisible(marker)]),
        !!element.closest('table, [role~="grid"]'),
        !!element.closest('tr, [role~="row"]'),
        !!element.closest('li, [role~="listitem"]'),
        !!element.closest("ol"),
        !!element.closest("dt"),
        !!element.closest("dl"),
        element.closest("dt")?.getAttribute("title"),
        !!element.closest('header, [role~="banner"]'),
        !!element.closest('nav, [role~="navigation"]'),
        !!element.closest('li, [role~="listitem"]')?.querySelector(':scope > ul, :scope > ol, :scope > [role~="group"], :scope > [role~="menu"]'),
        !!element.closest('article, [role~="article"]'),
        isQuestionCollection(element),
        includeCollection ? collectionEvidence(element, collectionCache) : null,
        includeSupplemental ? supplementalEvidence(element, supplementalCache) : null,
        !!element.closest('form, [role~="form" i]'),
        sourceDownloadEvidence(element, safeLabel),
        sourceAction(element, safeLabel),
        navigationUtility(element, safeLabel, navigationCache) ?? null
      ])
    };
  }
  function analyzePage() {
    const commonPurpose = documentPurpose();
    const contextCache = /* @__PURE__ */ new WeakMap();
    const navigationCache = createNavigationCache();
    const selector = 'a[href], button, [role~="button"], [role~="tab" i], input[type="submit"], input[type="button"], input[type="search"], input[type="text"], input:not([type]), [role~="searchbox"], [role~="textbox"], textarea';
    const elements = document.querySelectorAll(selector + (commonPurpose === "academic-calendar" ? ', table a:not([href]), [role~="grid"] a:not([href])' : ""));
    const candidates = [];
    for (const element of elements) {
      const label = candidateLabel(element);
      if (!label) continue;
      const { href, action, target } = sourceAction(element, label);
      let destinationHost;
      let opensNewWindow;
      if (element instanceof HTMLAnchorElement) {
        try {
          const raw = element.getAttribute("href")?.trim();
          if (raw && !raw.startsWith("#")) {
            const destination3 = new URL(raw, document.baseURI);
            if (/^https?:$/.test(destination3.protocol)) {
              destinationHost = destination3.hostname;
              const originalTarget = (element.getAttribute("target") ?? document.querySelector("base[target]")?.getAttribute("target") ?? "_self").toLowerCase();
              opensNewWindow = !["_self", "_top", "_parent", ""].includes(originalTarget);
            }
          }
        } catch {
        }
      }
      const labels = contextLabels(element, contextCache);
      candidates.push({
        element,
        label,
        href,
        action,
        target,
        destinationHost,
        opensNewWindow,
        context: sourceContext(element),
        score: 0,
        reasons: [],
        snapshot: sourceSnapshot(element, label, void 0, false, false, void 0, navigationCache),
        sectionLabel: labels[0],
        contextLabels: labels,
        pagePurpose: pagePurpose(element, labels, commonPurpose ?? null)
      });
    }
    return candidates;
  }

  // src/evidence-nodes.ts
  var editable2 = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var heading = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
  var control = 'a[href],button,[role~="button" i],[role~="tab" i]';
  function evidenceNodes(dependencies, fixedNames = []) {
    const decorations = [];
    const parents = [];
    const named = new Set(fixedNames);
    for (const node of dependencies) {
      if (node.matches(control)) {
        if (node.parentElement) parents.push(node.parentElement);
        const item = node.closest("li");
        if (item) parents.push(item);
      }
      if (!node.matches(heading) && !named.has(node)) continue;
      const pending = [...node.children];
      let visited = 0;
      while (pending.length) {
        const child = pending.pop();
        if (++visited > 64 || decorations.length >= 256) return;
        if (child.closest(editable2)) continue;
        decorations.push(child);
        pending.push(...child.children);
      }
    }
    return [.../* @__PURE__ */ new Set([...dependencies, ...parents, ...decorations])];
  }

  // src/institution-evidence.ts
  var ADAPTER_VERSION = 3;
  var editable3 = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var excluded = 'header,footer,article,aside,form,[role~="banner" i],[role~="contentinfo" i],[role~="article" i],[role~="complementary" i],[role~="form" i]';
  var headingSelector3 = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
  var normalize = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  var serviceEntry = /신청|예약|접수|발급|조회|로그인|인증|제출|청구/;
  function fixedName(element) {
    if (element.closest(`${editable3},${excluded}`)) return "";
    return normalize(candidateLabel(element));
  }
  function headingName(element, hidden = false) {
    if (!element.matches(headingSelector3) || element.closest(editable3) || element.hasAttribute("aria-labelledby")) return "";
    const name2 = normalize(hidden ? getSafeLabel(element) : candidateLabel(element));
    return name2.length >= 2 && name2.length <= 100 ? name2 : "";
  }
  function headings(container, hidden = false) {
    const nodes = [...container.querySelectorAll(headingSelector3)];
    if (nodes.length > 40) return [];
    return nodes.filter((node) => !node.closest(excluded) && !!headingName(node, hidden));
  }
  function sourceURL(element) {
    const raw = element.getAttribute("href");
    if (!raw) return;
    try {
      const url = new URL(raw, document.baseURI);
      if (url.origin === location.origin) return url;
    } catch {
    }
  }
  function linkStructure(element) {
    if (!element.matches("a[href]")) return null;
    try {
      const url = new URL(element.getAttribute("href") ?? "", document.baseURI);
      return /^https?:$/.test(url.protocol) ? [url.origin, url.pathname, url.hash] : [url.protocol];
    } catch {
      return ["unresolved"];
    }
  }
  function evidence(candidate, cache, adapter, rule, category, dependencies, score = 70, facts = {}) {
    const unique = evidenceNodes([candidate.element, ...dependencies], dependencies.filter((node) => node.matches(".s_tit,p")));
    if (!unique) return;
    return {
      adapter,
      version: ADAPTER_VERSION,
      rule,
      category,
      score,
      pageTask: facts.pageTask ?? "reading",
      dependencies: unique,
      ...facts.readonlyPanel ? { readonlyPanel: true } : {},
      ...facts.contentScope ? { contentScope: facts.contentScope } : {},
      // Raw URL queries, original scripts, input values and whole-region text are
      // deliberately absent. The generic source snapshot owns action/href checks.
      fingerprint: JSON.stringify([
        ADAPTER_VERSION,
        adapter,
        rule,
        location.origin,
        location.pathname,
        candidate.label,
        candidate.action,
        category,
        facts.pageTask ?? "reading",
        !!facts.readonlyPanel,
        facts.contentScope ?? "",
        facts.tokens ?? [],
        unique.map((node) => {
          const previous = cache?.get(node);
          if (previous?.nodeFacts) return previous.nodeFacts;
          const nodeFacts = [
            node.tagName,
            ...["id", "class", "role", "aria-controls", "aria-expanded", "aria-hidden", "hidden"].map((name2) => node.getAttribute(name2)),
            node instanceof HTMLElement ? linkStructure(node) : null,
            node instanceof HTMLElement && node.matches(headingSelector3) ? headingName(node, true) : node instanceof HTMLElement && node.matches("a[href],button,.s_tit") ? fixedName(node) : ""
          ];
          cache?.set(node, { ...previous, nodeFacts });
          return nodeFacts;
        })
      ])
    };
  }
  function education(candidate, name2, cache) {
    if (serviceEntry.test(name2)) return;
    const element = candidate.element;
    const root = element.closest("#contents");
    if (!root) return;
    const titles = headings(root).filter((node) => /교육|훈련/.test(headingName(node)));
    if (!titles.length) return;
    const menu = element.closest("#lnbmenu");
    if (menu && element.matches("a[href]") && element.closest("li") && /(?:교육|훈련)/.test(name2) && /(?:개요|계획|자료|안내|소개)$/.test(name2)) {
      const destination3 = sourceURL(element);
      if (destination3 && /^(?:\/safekorea-kor\/edtr\/|\/safekorea-kor\/cmmn\/bbs\/)/.test(destination3.pathname)) {
        return evidence(candidate, cache, "safekorea-education", "local-reading-menu", "help", [root, menu, ...titles], 65, { contentScope: "navigation" });
      }
    }
    const tabs = element.closest(".tab-area");
    if (!tabs || element.parentElement !== tabs || !element.matches("button.tab-list") || !/^(?:true|false)$/i.test(element.getAttribute("aria-expanded") ?? "") || !/(?:교육|훈련)/.test(name2) || !/(?:개요|개념|안내|소개)$/.test(name2)) return;
    const peers = [...tabs.children].filter((node) => node instanceof HTMLElement && node.matches("button.tab-list[aria-expanded]") && !!candidateLabel(node));
    if (peers.length < 2 || peers.length > 8 || !peers.includes(element) || peers.some((peer) => !/^(?:true|false)$/i.test(peer.getAttribute("aria-expanded") ?? ""))) return;
    const panels = peers.map((peer) => peer.nextElementSibling);
    if (panels.some((panel2) => !(panel2 instanceof HTMLElement) || !panel2.matches("div.tab-content") || !!panel2.closest(editable3))) return;
    const panel = element.nextElementSibling;
    const panelHeadings = headings(panel, true);
    if (!panelHeadings.length) return;
    return evidence(
      candidate,
      cache,
      "safekorea-education",
      "local-overview-panels",
      "help",
      [root, tabs, ...titles, ...peers, ...panels, ...panelHeadings],
      70,
      { contentScope: "content" }
    );
  }
  function pension(candidate, name2, cache) {
    const element = candidate.element;
    if (!element.matches("a[href]") || serviceEntry.test(name2) || /(?:납부|결제|지급|환급|삭제|탈퇴)(?:\s*하기)?$/.test(name2)) return;
    const wrap = element.closest(".tabWrap.con-tab");
    const nav = element.closest("ul.tabNav");
    if (!wrap || !nav || nav.parentElement !== wrap || !element.closest("li")) return;
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (!raw.startsWith("#") || raw.length < 2) return;
    let id;
    try {
      id = decodeURIComponent(raw.slice(1));
    } catch {
      return;
    }
    const targets = document.querySelectorAll(`#${CSS.escape(id)}`);
    if (targets.length !== 1) return;
    const panel = targets[0];
    if (!panel.matches("div.tabPage") || panel.closest(".tabWrap.con-tab") !== wrap || !panel.parentElement?.matches("div.tabContents") || panel.parentElement.parentElement !== wrap || panel.closest(editable3)) return;
    const peers = [...nav.querySelectorAll(":scope > li > a[href]")];
    if (peers.length < 2 || peers.length > 12 || !peers.includes(element)) return;
    const titles = headings(panel, true).filter((node) => headingName(node, true) === name2);
    if (!titles.length) return;
    const interactiveRoles = ["button", "link", "checkbox", "radio", "switch", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "treeitem", "tab", "dialog"].map((role) => `[role~="${role}" i]`).join(",");
    const interactivePanel = `${editable3},${excluded},a,button,label[for],${interactiveRoles},[tabindex],[onclick],iframe,object,embed,details,summary,audio[controls],video[controls]`;
    const readonlyPanel = !panel.matches(interactivePanel) && !panel.querySelector(interactivePanel);
    if (!readonlyPanel && !/(?:국민\s*연금|사회\s*보장|노후)/.test(name2)) return;
    return evidence(
      candidate,
      cache,
      "nps-explanation",
      "named-local-explanation-panel",
      "help",
      [wrap, nav, panel.parentElement, panel, ...titles, ...peers],
      70,
      readonlyPanel ? { readonlyPanel: true, contentScope: "content" } : {}
    );
  }
  function university(candidate, name2, cache) {
    const academic = academicTabs(candidate, name2, cache);
    if (academic) return academic;
    const element = candidate.element;
    const board = element.closest(".common-board");
    const title = element.closest("dt.board-thumb-content-title");
    const list = element.closest("ul.board-thumb-wrap");
    if (!board || !title || !list || !board.contains(list) || !element.matches("a[href]")) return;
    const destination3 = sourceURL(element);
    if (!destination3 || destination3.pathname !== location.pathname) return;
    if (!["articleNo", "articleId", "article_no", "article_id"].some((key) => destination3.searchParams.has(key))) return;
    const cachedBoard = cache?.get(board);
    const boardTitles = cachedBoard?.boardTitles ?? headings(board).filter((node) => /(?:IT|전산|정보화|서비스).*게시판/i.test(headingName(node)));
    if (cache && !cachedBoard?.boardTitles) cache.set(board, { ...cachedBoard, boardTitles });
    if (!boardTitles.length) return;
    const label = name2.replace(/^\[[^\]]{1,30}\]\s*/, "");
    const incident = /일시\s*(?:중지|중단|장애|순단)|(?:서비스|시스템|네트워크|서버|접속|운영).{0,24}(?:중지|중단|장애|순단)|(?:점검|이관|패치|업그레이드).{0,24}(?:작업|일정)|(?:운영\s*방법|정책|서비스).{0,12}변경/.test(label);
    const instruction = /(?:설치|설정|사용|이용|활용|추가|해결|복구|대처|대응).{0,24}(?:방법|절차|매뉴얼|설명서|가이드|안내)/.test(label);
    if (incident === instruction) return;
    return evidence(
      candidate,
      cache,
      "smu-it-documents",
      incident ? "incident-document" : "instruction-document",
      incident ? "notice" : "help",
      [board, list, title, ...boardTitles],
      70,
      { contentScope: "content" }
    );
  }
  var academicTopic = /학사|학적|학위|학점|전공|교양|휴학|복학|재입학|자퇴|제적|전과|증명서/;
  var academicOperation = /신청|예약|접수|조회|로그인|인증|제출|청구|포털|시스템|바로\s*가기|발급\s*하기/;
  function academicDocument(element) {
    const destination3 = sourceURL(element);
    return !!destination3 && /^\/kor\/life\/[a-z][a-z0-9_-]*\.do$/i.test(destination3.pathname) && !/\/(?:apply|application|reserve|reservation|login|signin|sso|portal|issue)\.do$/i.test(destination3.pathname) && !["articleNo", "articleId", "article_no", "article_id"].some((key) => destination3.searchParams.has(key));
  }
  function academicTabs(candidate, name2, cache) {
    const element = candidate.element;
    if (!element.matches("a[href]") || !academicTopic.test(name2) || academicOperation.test(name2)) return;
    const list = element.closest("ul.tab-ul");
    const outer = element.closest(".tab-outer");
    if (!list || !outer || !outer.contains(list) || !outer.parentElement?.matches(".contents-wrap")) return;
    const section = outer.nextElementSibling;
    if (!(section instanceof HTMLElement) || !section.matches("section.content-wrap")) return;
    const content = section.querySelector(":scope > .content");
    if (!content) return;
    const titles = [...content.querySelectorAll(":scope > h4")].filter((node) => !!headingName(node));
    if (titles.length !== 1) return;
    const peers = [...list.querySelectorAll(":scope > li > a[href]")];
    if (peers.length < 2 || peers.length > 12 || !peers.includes(element) || !academicDocument(element)) return;
    const selected4 = peers.filter((peer) => peer.parentElement?.matches(".active,.swiper-slide-active") || /^(?:page|true)$/i.test(peer.getAttribute("aria-current") ?? ""));
    if (selected4.length !== 1 || normalize(candidateLabel(selected4[0])) !== headingName(titles[0]) || !academicTopic.test(headingName(titles[0]))) return;
    const educational = peers.filter((peer) => {
      const label = normalize(candidateLabel(peer));
      return !!label && academicTopic.test(label) && !academicOperation.test(label) && academicDocument(peer);
    });
    if (educational.length < 2 || educational.length <= peers.length / 2) return;
    return evidence(
      candidate,
      cache,
      "smu-academic-documents",
      "selected-topic-following-content",
      "academic",
      [outer.parentElement, outer, list, section, content, ...titles, ...selected4, ...educational],
      70,
      { contentScope: "navigation" }
    );
  }
  var guideDownloadName = /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|download)(?:\s*하기)?$/i;
  function libraryGuideButton(element) {
    if (!element.matches("button.download_btn") || element.closest(`${editable3},${excluded}`) || !candidateLabel(element)) return;
    const heading2 = element.parentElement;
    const branch = element.closest(".link_api_cont");
    const name2 = normalize(candidateLabel(element));
    if (!heading2?.matches("h4.tit") || !branch || heading2.parentElement !== branch || !guideDownloadName.test(name2) || headingName(heading2) !== name2) return;
    return { heading: heading2, branch };
  }
  function semanticTabName(element) {
    const name2 = normalize(candidateLabel(element));
    const state = [...element.querySelectorAll(":scope > .sr-only")].some((node) => /^(?:선택됨|selected)$/i.test(normalize(candidateLabel(node))));
    return state ? name2.replace(/\s*(?:선택됨|selected)$/i, "").trim() : name2;
  }
  var copyTopic = /복사|복제|출력|인쇄|스캔/;
  function copyingTabs(candidate, region, info, slider, wrapper, peers, cache) {
    const titles = [...info.querySelectorAll(":scope > h3")].filter((node) => copyTopic.test(headingName(node)));
    if (!titles.length || peers.some((peer) => !copyTopic.test(semanticTabName(peer)))) return;
    const selected4 = peers.filter((peer) => peer.parentElement?.matches(".on,.swiper-slide-active") || /^(?:page|true)$/i.test(peer.getAttribute("aria-current") ?? ""));
    if (selected4.length !== 1) return;
    const bodies = [...region.querySelectorAll(":scope > .content_wrap > .sub_content > .copy_data_wrap")];
    if (bodies.length !== 1 || bodies[0].closest(excluded)) return;
    const body = bodies[0];
    const labels = [...body.querySelectorAll(":scope > .txt > .s_tit")];
    if (labels.length > 12) return;
    const instruction = labels.filter((node) => /^(?:이용|사용)\s*(?:안내|방법)$|(?:복사|복제|인쇄|출력|스캔).{0,20}(?:방법|안내|절차)$/.test(fixedName(node)) && !node.parentElement?.querySelector(`${editable3},form,a[href],button,[role~="button" i]`));
    if (!instruction.length) return;
    return evidence(
      candidate,
      cache,
      "nl-reading-guides",
      "local-copying-instruction-tabs",
      "help",
      [
        region,
        info,
        slider,
        wrapper,
        body,
        ...titles,
        ...instruction,
        ...peers,
        ...selected4.map((peer) => peer.parentElement)
      ],
      70,
      { contentScope: "content" }
    );
  }
  function refundEntry(candidate, name2, region, cache) {
    const element = candidate.element;
    if (candidate.action !== "navigate" || !element.matches("a[href]") || !/(?:환급|환불|반환)/.test(name2)) return;
    const destination3 = sourceURL(element);
    if (!destination3 || !/^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(destination3.pathname) || destination3.pathname === location.pathname) return;
    const paragraph = element.parentElement;
    const block = paragraph?.parentElement;
    const body = element.closest(".copy_data_wrap");
    const title = block?.previousElementSibling;
    if (!paragraph?.matches("p") || !block?.matches(".txt") || !body || body.closest("#sub_content") !== region || block.parentElement !== body || !(title instanceof HTMLElement) || !title.matches("h4.tit") || !/(?:환급|환불|반환).{0,20}(?:안내|방법|절차)/.test(headingName(title)) || paragraph.closest(`${editable3},${excluded}`) || paragraph.querySelector(editable3) || paragraph.querySelectorAll("a[href]").length !== 1) return;
    const method = normalize(getSafeLabel(paragraph));
    if (!/(?:신청|접수)\s*(?:방법|절차)/.test(method) || !/(?:메뉴|항목).{0,18}(?:직접\s*)?(?:신청|접수)/.test(method)) return;
    return evidence(
      candidate,
      cache,
      "nl-service-entry",
      "explicit-refund-application-method",
      "apply",
      [region, body, title, block, paragraph],
      70,
      { pageTask: "control", contentScope: "content", tokens: ["application-method", "named-menu-entry"] }
    );
  }
  function library(candidate, name2, cache) {
    const element = candidate.element;
    const region = element.closest("#sub_content");
    if (!region) return;
    const ownGuide = libraryGuideButton(element);
    if (ownGuide) return evidence(
      candidate,
      cache,
      "nl-reading-guides",
      "editorial-guide-download",
      "help",
      [region, ownGuide.branch, ownGuide.heading],
      70,
      { contentScope: "content" }
    );
    const refund = refundEntry(candidate, name2, region, cache);
    if (refund) return refund;
    if (!element.matches("a[href]") || serviceEntry.test(name2)) return;
    const group = element.parentElement;
    const wrapper = group?.parentElement;
    const slider = wrapper?.parentElement;
    const info = slider?.parentElement;
    if (!group?.matches('[role~="group"]') || !wrapper?.matches(".swiper-wrapper") || !slider?.matches(".depth4-menu__slider") || !info?.matches(".content_info") || info.closest("#sub_content") !== region) return;
    const peers = [...wrapper.querySelectorAll(':scope > [role~="group"] > a[href]')];
    if (peers.length < 2 || peers.length > 8 || !peers.includes(element)) return;
    if (peers.some((peer) => {
      const destination3 = sourceURL(peer);
      return !destination3 || !/^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(destination3.pathname) || !candidateLabel(peer) || serviceEntry.test(semanticTabName(peer));
    })) return;
    const copying = copyingTabs(candidate, region, info, slider, wrapper, peers, cache);
    if (copying) return copying;
    const titles = [...info.querySelectorAll(":scope > h3")].filter((node) => /검색/.test(headingName(node)));
    if (!titles.length) return;
    const semanticName = semanticTabName(element);
    if (!/(?:검색|결과|정보|기능|정렬|색인|서지)/.test(semanticName) || peers.some((peer) => {
      const destination3 = sourceURL(peer);
      return !destination3 || !/^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(destination3.pathname) || !candidateLabel(peer) || serviceEntry.test(semanticTabName(peer));
    })) return;
    const guides = [...region.querySelectorAll(".link_api_cont > h4.tit > button.download_btn")];
    if (guides.length !== 1 || !libraryGuideButton(guides[0]) || !isVisible(guides[0])) return;
    const guide = libraryGuideButton(guides[0]);
    return evidence(
      candidate,
      cache,
      "nl-reading-guides",
      "local-explanatory-guide-tabs",
      "help",
      [region, info, slider, wrapper, group, ...titles, ...peers, guides[0], guide.branch, guide.heading],
      70,
      { contentScope: "content" }
    );
  }
  function safetyGuidance(candidate, name2, cache) {
    const element = candidate.element;
    if (!(element instanceof HTMLButtonElement) || element.type !== "button" || element.form) return;
    const region = element.closest(".cont-area");
    const content = region?.closest(".content-right");
    if (!region || !content || !content.closest("#contents")) return;
    const titles = headings(content).filter((node) => node.closest(".cont-area") === region && /안전.*점검|점검.*(?:안내|가이드)|체크.*가이드|check\s*guide/i.test(headingName(node)));
    if (!titles.length) return;
    if (element.matches(".btn-down") && /(?:점검표|체크리스트|checklist)\s*(?:다운로드|내려\s*받기)$/i.test(name2)) {
      return evidence(
        candidate,
        cache,
        "safekorea-safety-guidance",
        "checklist-preparation-document",
        "help",
        [content, region, ...titles],
        70,
        { contentScope: "content" }
      );
    }
    const area = element.parentElement;
    const list = area?.previousElementSibling;
    const guide = list?.previousElementSibling;
    if (!element.matches(".btn-golist") || !area?.matches(".button-rightarea") || area.parentElement !== region || !/(?:점검|체크).*(?:리스트|목록|안내).*(?:시작|보기|확인)$/.test(name2) || !(list instanceof HTMLElement) || !list.matches("ul.comm-list") || list.children.length > 12 || list.querySelector(`${editable3},form,button`) || !(guide instanceof HTMLElement) || !guide.matches("h3") || !/(?:체크|점검)\s*(?:가이드|안내)|check\s*guide/i.test(headingName(guide))) return;
    return evidence(
      candidate,
      cache,
      "safekorea-safety-guidance",
      "guided-safety-instruction",
      "help",
      [content, region, area, list, guide, ...titles],
      70,
      { pageTask: "control", contentScope: "content" }
    );
  }
  function institutionEvidence(candidate, cache) {
    const handler = location.hostname === "www.safekorea.go.kr" && /^\/safekorea-kor\/edtr\//.test(location.pathname) ? education : location.hostname === "www.safekorea.go.kr" && /^\/safekorea-kor\/acts\/asck\//.test(location.pathname) ? safetyGuidance : location.hostname === "www.nps.or.kr" && /^\/pnsinfo\/ntpsklg\//.test(location.pathname) ? pension : location.hostname === "www.smu.ac.kr" && /^\/kor\/life\/[a-z][a-z0-9_-]*\.do$/i.test(location.pathname) ? university : location.hostname === "www.nl.go.kr" && /^\/NL\/contents\/[a-z0-9_-]+\.do$/i.test(location.pathname) ? library : void 0;
    if (!handler) return;
    const element = candidate.element;
    if (location.protocol !== "https:" || location.port || candidate.context === "footer" || !isVisible(element) || element.closest(`${editable3},${excluded}`) || !element.matches("a[href],button") || candidateLabel(element) !== candidate.label) return;
    const name2 = normalize(candidate.label);
    if (!name2 || name2.length > 100) return;
    return handler(candidate, name2, cache);
  }

  // src/content-evidence.ts
  var editable4 = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var excluded2 = 'header,footer,nav,aside,article,[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i],[role~="complementary" i],[role~="article" i]';
  var form2 = 'form,[role~="form" i]';
  var lists = 'ul,ol,[role~="list" i],[role~="tablist" i]';
  var headings2 = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
  var documentKind = /안내서|안내\s*책자|책자|편람|설명서|매뉴얼|자료집|지침서|핸드북|요람|\b(?:handbook|manual|guide|documents?)\b/i;
  var normalize2 = (text3) => text3.normalize("NFKC").replace(/\s+/g, " ").trim();
  var dangerous = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;
  function utility(element) {
    for (let node = element, depth = 0; node && depth < 8; node = node.parentElement, depth++) {
      const metadata = `${node.getAttribute("class") ?? ""} ${node.getAttribute("id") ?? ""}`;
      if (/(?:^|[\s_-])(?:breadcrumbs?|skip(?:links?|nav|navigation)?)(?:[\s_-]|$)/i.test(metadata) || /breadcrumb|이동\s*경로/i.test(node.getAttribute("aria-label") ?? "")) return true;
    }
    return false;
  }
  function currentDocument(element) {
    const raw = element.getAttribute("href")?.trim();
    if (!raw || /^(?:javascript:|data:)/i.test(raw)) return false;
    try {
      const url = new URL(raw, document.baseURI);
      return /^https?:$/.test(url.protocol) && url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
    } catch {
      return false;
    }
  }
  function selected(element) {
    return [element, element.parentElement].some((node) => !!node && (/^(?:page|true)$/i.test(node.getAttribute("aria-current") ?? "") || /^true$/i.test(node.getAttribute("aria-selected") ?? "") || /(?:^|\s)(?:active|selected|current|is-active)(?:\s|$)/i.test(node.getAttribute("class") ?? "")));
  }
  function listControls(list) {
    if (list.childElementCount < 2 || list.childElementCount > 12) return [];
    return [...list.querySelectorAll(':scope > li > a[href],:scope > [role~="listitem" i] > a[href]')].filter((node) => !node.closest(`${excluded2},${form2},${editable4}`) && !!candidateLabel(node) && !node.matches("[onclick],[aria-expanded],[aria-haspopup]") && !dangerous.test(candidateLabel(node)) && safeReadingURL(node));
  }
  function safeReadingURL(element) {
    try {
      const url = new URL(element.getAttribute("href") ?? "", document.baseURI);
      if (!/^https?:$/.test(url.protocol)) return false;
      const parts = url.pathname.split("/").map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part;
        }
      });
      if (parts.some((part) => dangerous.test(part.replace(/[_.-]/g, " ")))) return false;
      for (const [key, value] of url.searchParams) {
        if (/^(?:logout|signout|delete|remove|payment|checkout|final_submit)$/i.test(key) || /^(?:action|cmd|command|mode|task|event|method|operation|do)$/i.test(key) && (dangerous.test(value) || /^submit$/i.test(value))) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  function currentSelection(controls3) {
    const active = controls3.filter(selected);
    return active.length === 1 && currentDocument(active[0]) ? active[0] : void 0;
  }
  function localLists(container) {
    const result = [];
    const pending = [...container.children].reverse();
    let visited = 0;
    while (pending.length && visited++ < 80) {
      const node = pending.pop();
      if (!(node instanceof HTMLElement) || node.matches(`${excluded2},${form2},${editable4},section,[role~="region" i]`)) continue;
      if (node.matches(lists)) {
        result.push(node);
        continue;
      }
      pending.push(...[...node.children].reverse());
    }
    return pending.length ? [] : result;
  }
  function fixedHeading(element) {
    return element.matches(headings2) && !element.closest(`${editable4},${excluded2},${form2}`) && !element.hasAttribute("aria-labelledby") ? normalize2(candidateLabel(element)) : "";
  }
  function documentRelation(list, active) {
    const name2 = normalize2(candidateLabel(active));
    const main = list.closest('main,[role~="main" i]');
    if (main) {
      const region = list.closest('section,[role~="region" i]') ?? main;
      if (region.childElementCount <= 12) {
        const titles = [...region.children].filter((node) => node instanceof HTMLElement && fixedHeading(node) === name2 && !!(node.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING));
        if (titles.length === 1) return [main, region, titles[0]];
      }
    }
    for (let container = list.parentElement, depth = 0; container && depth < 4; container = container.parentElement, depth++) {
      if (container.matches(`html,body,${excluded2},${form2},${editable4}`) || container.childElementCount > 12) break;
      const content = container.nextElementSibling;
      if (!(content instanceof HTMLElement) || !content.matches('section,[role~="region" i]') || content.closest(`${excluded2},${form2},${editable4}`)) continue;
      const parents = localLists(container).filter((peer) => peer !== list && !!(peer.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)).map((peer) => ({ list: peer, controls: listControls(peer) })).map((peer) => ({ ...peer, active: currentSelection(peer.controls) })).filter((peer) => !!peer.active);
      if (parents.length === 1) return [container, content, parents[0].list, parents[0].active, parents[0].active.parentElement];
    }
  }
  function evidence2(candidate, level, rule, dependencies, tokens = [], cache) {
    const nodes = evidenceNodes([candidate.element, ...dependencies]);
    if (!nodes) return;
    return {
      level,
      rule,
      dependencies: nodes,
      fingerprint: JSON.stringify([
        rule,
        level,
        location.origin,
        location.pathname,
        candidate.label,
        candidate.action,
        tokens,
        nodes.map((node) => {
          const previous = cache?.get(node);
          if (previous?.nodeFacts) return previous.nodeFacts;
          const nodeFacts = [
            node.tagName,
            ...["class", "role", "aria-current", "aria-selected", "aria-expanded", "aria-hidden", "hidden"].map((name2) => node.getAttribute(name2)),
            node instanceof HTMLElement && node.matches(headings2) ? fixedHeading(node) : node instanceof HTMLElement && node.matches("a[href],button") ? candidateLabel(node) : "",
            node instanceof HTMLElement && node.matches("a[href]") ? currentDocument(node) : null
          ];
          cache?.set(node, { ...previous, nodeFacts });
          return nodeFacts;
        })
      ])
    };
  }
  function sameContentSearch(candidate, cache) {
    const element = candidate.element;
    if (candidate.category !== "search" || candidate.pageTask !== "control" || candidate.context !== "body" || candidate.action !== "locate" || element.closest(excluded2)) return;
    const owner = element instanceof HTMLInputElement || element instanceof HTMLButtonElement ? element.form : null;
    if (!(owner instanceof HTMLFormElement) || !owner.contains(element) || !["get", "post"].includes(owner.method.toLowerCase()) || owner.closest(excluded2) || dangerous.test((owner.getAttribute("onsubmit") ?? "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ")) || !(element instanceof HTMLInputElement && ["text", "search"].includes(element.type) || (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && ["button", "submit"].includes(element.type) && /^(?:검색|search)$/i.test(candidate.label)) || owner.querySelector('[contenteditable]:not([contenteditable="false" i]),textarea,[role~="textbox" i],[role~="searchbox" i]')) return;
    const old = cache?.get(owner);
    if (old?.searchRelation !== void 0) return old.searchRelation ?? void 0;
    const compute = () => {
      try {
        const action = new URL(owner.getAttribute("action") || location.href, document.baseURI);
        if (action.origin !== location.origin || action.pathname !== location.pathname || action.pathname.split("/").some((part) => {
          try {
            return dangerous.test(decodeURIComponent(part).replace(/[_.-]/g, " "));
          } catch {
            return true;
          }
        })) return;
        for (const key of action.searchParams.keys()) if (/^(?:logout|signout|delete|remove|payment|checkout|final_submit)$/i.test(key) || /^(?:action|cmd|command|mode|task|operation)$/i.test(key) && action.searchParams.getAll(key).some((value) => dangerous.test(value) || /^submit$/i.test(value))) return;
      } catch {
        return;
      }
      const inputs = [...owner.querySelectorAll('input:not([type="hidden" i])')];
      if (inputs.some((node) => !["text", "search", "button", "submit"].includes(node.type))) return;
      const fields = inputs.filter((node) => ["text", "search"].includes(node.type));
      if (fields.length !== 1 || !isVisible(fields[0]) || !isSearchControl(fields[0], candidateLabel(fields[0]))) return;
      const buttons = [...owner.querySelectorAll('button,input[type="button" i],input[type="submit" i]')];
      const submits = buttons.filter((node) => ["button", "submit"].includes(node.type) && isVisible(node) && /^(?:검색|search)$/i.test(candidateLabel(node)));
      if (submits.length !== 1 || owner.method.toLowerCase() === "post" && submits[0].type !== "button" || buttons.some((node) => dangerous.test(candidateLabel(node)))) return;
      if (element !== fields[0] && element !== submits[0]) return;
      const legends = [...owner.querySelectorAll("legend")].filter((node) => /검색|search/i.test(candidateLabel(node)));
      for (let region = owner.parentElement, depth = 0; region && depth < 3; region = region.parentElement, depth++) {
        if (region.matches(`html,body,${excluded2},${form2}`) || region.childElementCount > 16) break;
        let titles = [...region.children].filter((node) => node instanceof HTMLElement && !!fixedHeading(node) && /게시판|목록|자료|증명|서비스|board|catalog|services?/i.test(fixedHeading(node)) && !!(node.compareDocumentPosition(owner) & Node.DOCUMENT_POSITION_FOLLOWING));
        const contextNodes = [];
        if (!titles.length && legends.length) {
          const groups = [...region.children].filter((node) => node instanceof HTMLElement && node.matches('ul,ol,[role~="tablist" i]') && node.childElementCount >= 2 && node.childElementCount <= 12 && !!(node.compareDocumentPosition(owner) & Node.DOCUMENT_POSITION_FOLLOWING));
          for (const group of groups) {
            const peers = [...group.querySelectorAll(":scope > li > a[href]")];
            const active = peers.filter(selected);
            if (active.length === 1 && normalize2(candidateLabel(active[0])) === normalize2(candidate.sectionLabel ?? "") && !dangerous.test(candidateLabel(active[0]))) {
              titles.push(active[0]);
              contextNodes.push(group, ...peers);
            }
          }
        }
        const contextName = titles[0]?.matches(headings2) ? fixedHeading(titles[0]) : titles[0] ? candidateLabel(titles[0]) : "";
        if (titles.length !== 1 || !legends.length && !/게시판|board/i.test(contextName)) continue;
        const containers = [];
        for (const child of region.children) {
          if (!(child instanceof HTMLElement) || child === owner || child.matches(`${excluded2},${form2},${editable4}`) || !(owner.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
          if (child.matches('ul,ol,table,[role~="list" i]')) containers.push(child);
          else if (child.childElementCount <= 6) containers.push(...[...child.children].filter((node) => node instanceof HTMLElement && node.matches('ul,ol,table,[role~="list" i]')));
        }
        const contentLists = containers.filter((list2) => list2.childElementCount >= 2 && !/(?:^|[\s_-])(?:paging|pagination|pager)(?:[\s_-]|$)/i.test(`${list2.getAttribute("class") ?? ""} ${list2.getAttribute("id") ?? ""}`) && !/페이지\s*(?:이동|탐색)|page\s*navigation/i.test(list2.getAttribute("aria-label") ?? ""));
        if (contentLists.length !== 1) continue;
        const list = contentLists[0];
        const rows = list instanceof HTMLTableElement ? list.tBodies[0] : list;
        if (!rows || rows.childElementCount < 2) continue;
        const rowNodes = [];
        let count = 0, visited = 0;
        for (let row = rows.firstElementChild; row && visited++ < 12 && count < 2; row = row.nextElementSibling) {
          if (row.querySelector(`${editable4},${form2}`)) continue;
          const links = [...row.querySelectorAll("a[href]")];
          if (!links.length || links.length > 4 || links.some((link) => candidateLabel(link).length < 4 || /^\d+$/.test(candidateLabel(link)) || dangerous.test(candidateLabel(link)))) continue;
          rowNodes.push(row, ...links);
          count++;
        }
        if (count !== 2) continue;
        return { group: owner, dependencies: [owner, region, ...titles, ...contextNodes, ...legends, fields[0], submits[0], ...fields[0].parentElement ? [fields[0].parentElement] : [], list, rows, ...rowNodes] };
      }
    };
    const result = compute();
    cache?.set(owner, { ...old, searchRelation: result ?? null });
    return result;
  }
  function contentEvidence(candidate, cache, supplementalCache) {
    const element = candidate.element;
    if (candidate.category && candidate.score >= 55 && isVisible(element) && candidateLabel(element) === candidate.label) {
      const localSearch = sameContentSearch(candidate, cache);
      if (localSearch) {
        const proof2 = evidence2(candidate, 1, "same-content-query-form", localSearch.dependencies, [], cache);
        if (proof2) return { ...proof2, taskGroup: localSearch.group };
      }
    }
    if (!candidate.category || !candidate.pageTask || candidate.score < 55 || candidate.context === "footer" || !isVisible(element) || candidateLabel(element) !== candidate.label || element.closest(`${excluded2},${editable4}`) || utility(element) || !element.matches('a[href],button,[role~="button" i],[role~="tab" i]')) return;
    const supplement = candidate.supplementalDependent ? supplementalEvidence(element, supplementalCache) : void 0;
    const prep = supplement;
    const preparation2 = element.matches("a[href]") && candidate.action === "locate" && !!prep?.preparationAttachment;
    if (element.closest(form2) && !preparation2 || element instanceof HTMLButtonElement && !!element.form) return;
    if (preparation2) {
      const row2 = element.closest('tr,li,[role~="row" i],[role~="listitem" i]');
      const table = row2?.closest('table,[role~="grid" i]');
      const owner = element.closest(form2) ?? row2?.parentElement;
      if (row2 && owner) return evidence2(
        candidate,
        2,
        "explicit-preparation-attachment",
        [row2, owner, ...table ? [table] : []],
        [prep?.preparationAttachmentNodes ?? [], supplement?.relatedLabel ?? ""],
        cache
      );
    }
    const institution = candidate.institutionEvidence;
    const panel = institution?.readonlyPanel;
    const row = element.closest('li,[role~="listitem" i]');
    if (!panel && (element.matches("[aria-expanded],[aria-haspopup],[aria-controls]") || row?.querySelector(':scope > ul,:scope > ol,:scope > [role~="group" i],:scope > [role~="menu" i]'))) return;
    if (candidate.pageTask === "reading" && element.matches("a[href]") && documentKind.test(candidate.label)) {
      const list = element.closest(lists);
      if (list) {
        const peers = listControls(list);
        const active = currentSelection(peers);
        const documents = peers.filter((peer) => documentKind.test(candidateLabel(peer)));
        const relation = active && documents.length >= 2 && peers.includes(element) ? documentRelation(list, active) : void 0;
        if (relation) return evidence2(
          candidate,
          2,
          "current-topic-document-group",
          [list, active, active.parentElement, ...documents, ...documents.map((peer) => peer.parentElement), ...relation],
          [],
          cache
        );
      }
    }
    if (candidate.relationEvidence?.contentScope === "content") return evidence2(
      candidate,
      1,
      "verified-current-content-relation",
      [...candidate.relationEvidence.dependencies],
      [candidate.relationEvidence.rule, candidate.relationEvidence.category, candidate.relationEvidence.pageTask],
      cache
    );
    if (institution?.contentScope === "content") return evidence2(
      candidate,
      1,
      "institution-current-content",
      [...institution.dependencies],
      [institution.version, institution.adapter, institution.rule, institution.category, institution.pageTask, !!institution.readonlyPanel],
      cache
    );
  }

  // src/service-relations.ts
  var editable5 = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var excluded3 = 'header,footer,nav,aside,article,form,[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i],[role~="complementary" i],[role~="article" i],[role~="form" i]';
  var controls = 'a[href],button,[role~="button" i],[role~="tab" i]';
  var headings3 = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
  var fixedTitles = `${headings3},strong`;
  var danger = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;
  var commandKey = /^(?:action|cmd|command|mode|task|event|method|operation|do)$/i;
  var riskKey = /^(?:logout|signout|delete|remove|payment|checkout|final_submit)$/i;
  var details = /^(?:상세\s*보기|자세히\s*보기|세부\s*정보|details?)$/i;
  var issue = /^(?:발급(?:\s*(?:하기|신청))?|신청(?:\s*하기)?|예약(?:\s*하기)?|접수(?:\s*하기)?)$/;
  var preview = /^(?:미리\s*보기|견본\s*보기|preview)$/i;
  var mediaView = /^(?:(?:센터|기관|활동|현장)\s*)?(?:소식|사진(?:\s*자료)?|영상(?:\s*자료)?|동영상(?:\s*자료)?|news|photos?|videos?)$/i;
  var normalize3 = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  var compact = (value) => normalize3(value).replace(/\s+/g, "");
  function name(element) {
    return normalize3(candidateLabel(element));
  }
  function decoded(value) {
    for (let i = 0; i < 2; i++) {
      try {
        const next = decodeURIComponent(value);
        if (next === value) break;
        value = next;
      } catch {
        break;
      }
    }
    return value;
  }
  function unsafeScript(value) {
    const text3 = decoded(value);
    return danger.test(text3) || /(?:delete|remove|logout|signout|pay|purchase|submit)(?:[A-Z][\w$]*)?\s*\(/.test(text3);
  }
  function safeURL(element) {
    const raw = element.getAttribute("href");
    if (!raw) return !element.matches("a");
    if (/^javascript:/i.test(raw.trim())) return !unsafeScript(raw);
    try {
      const url = new URL(raw, document.baseURI);
      if (!/^https?:$/.test(url.protocol)) return false;
      if (url.pathname.split("/").some((part) => danger.test(decoded(part).replace(/[_.-]/g, " ")))) return false;
      for (const [key, value] of url.searchParams) if (riskKey.test(key) || commandKey.test(key) && (danger.test(decoded(value)) || /^submit$/i.test(decoded(value)))) return false;
      return true;
    } catch {
      return false;
    }
  }
  function safeControl(element) {
    if (!isVisible(element) || element.closest(`${excluded3},${editable5}`) || element.querySelector(editable5) || element.matches("[aria-expanded],[aria-haspopup],[aria-controls]") || element instanceof HTMLButtonElement && !!element.form) return false;
    const label = name(element);
    return !!label && !danger.test(label) && !danger.test(element.getAttribute("title") ?? "") && safeURL(element) && [...element.attributes].filter((attribute) => /^on/i.test(attribute.name)).every((attribute) => !unsafeScript(attribute.value));
  }
  function fixedName2(element) {
    if (!element.matches(fixedTitles) || element.closest(`${excluded3},${editable5},${controls}`) || element.querySelector(`${editable5},${controls}`) || element.hasAttribute("aria-labelledby")) return "";
    const label = name(element);
    return label.length >= 2 && label.length <= 80 && !danger.test(label) ? label : "";
  }
  function scan(root, selector, limit = 160, prune = excluded3) {
    const pending = [...root.children].reverse();
    const matches = [];
    let visited = 0;
    while (pending.length) {
      const element = pending.pop();
      if (++visited > limit) return;
      if (!(element instanceof HTMLElement) || element.matches(`script,style,template,noscript,${prune}`)) continue;
      if (element.matches(selector)) matches.push(element);
      if (element.matches(editable5)) continue;
      pending.push(...[...element.children].reverse());
    }
    return matches;
  }
  function currentDocument2(element) {
    const raw = element.getAttribute("href");
    if (!raw || !safeURL(element)) return false;
    try {
      const url = new URL(raw, document.baseURI);
      return /^https?:$/.test(url.protocol) && url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !url.hash;
    } catch {
      return false;
    }
  }
  function selected2(element) {
    return [element, element.parentElement].some((node) => !!node && (/^(?:page|true)$/i.test(node.getAttribute("aria-current") ?? "") || /^true$/i.test(node.getAttribute("aria-selected") ?? "") || /(?:^|\s)(?:active|selected|current|on|is-active)(?:\s|$)/i.test(node.getAttribute("class") ?? "")));
  }
  function evidence3(candidate, rule, category, pageTask, dependencies, titles, relatedLabel) {
    const nodes = evidenceNodes([candidate.element, ...dependencies], titles);
    if (!nodes) return;
    return {
      rule,
      category,
      score: 70,
      pageTask,
      contentScope: "content",
      relatedLabel,
      dependencies: nodes,
      // Source snapshots own complete action/href/target checks. Opaque queries
      // and original scripts are never serialized into this semantic proof.
      fingerprint: JSON.stringify([
        rule,
        category,
        pageTask,
        candidate.label,
        candidate.action,
        relatedLabel,
        location.origin,
        location.pathname,
        nodes.map((node) => [
          node.tagName,
          ...["class", "role", "aria-selected", "aria-current", "aria-expanded", "aria-hidden", "hidden", "title"].map((key) => node.getAttribute(key)),
          node instanceof HTMLElement && titles.includes(node) ? fixedName2(node) : node instanceof HTMLElement && node.matches(controls) ? name(node) : "",
          node instanceof HTMLElement && node.matches("a[href]") ? currentDocument2(node) : null
        ])
      ])
    };
  }
  function localTask(candidate) {
    const own = /^(?:나의|내|본인|my)\s*(.+?)(?:\s*(?:보기|조회|현황|내역|상태))$/i;
    const publicReading = /^(.+?)\s*공개(?:\s*(?:목록|내역))?$/;
    const taskTitle = /^(.{2,28}?)\s*(?:신청|예약|접수)(?:\s*하기)?$/;
    const ownName = name(candidate.element);
    if (!own.test(ownName) && !publicReading.test(ownName) && !/(?:신청|예약|접수)/.test(ownName)) return;
    for (let root = candidate.element.parentElement, depth = 0; root && depth < 7; root = root.parentElement, depth++) {
      if (root.matches(`html,body,${excluded3},${editable5}`)) break;
      const lists2 = scan(root, 'ul,ol,[role~="tablist" i]', 120);
      if (!lists2) continue;
      for (const list of lists2) {
        if (list.childElementCount < 2 || list.childElementCount > 6 || list.querySelector(editable5)) continue;
        const peers = scan(list, controls, 40);
        if (!peers || peers.length !== list.childElementCount || !peers.every(safeControl)) continue;
        const chosen = peers.filter(selected2);
        if (chosen.length !== 1 || !currentDocument2(chosen[0])) continue;
        const title = name(chosen[0]);
        const task = title.match(taskTitle);
        if (!task) continue;
        const subject = compact(task[1]);
        if (subject.length < 2) continue;
        const role = (peer) => {
          const label = name(peer);
          if (peer === chosen[0] && compact(label) === compact(title)) return "apply";
          const privateView = label.match(own);
          if (privateView && compact(privateView[1]) === subject) return "apply";
          const published = label.match(publicReading);
          if (published && compact(published[1]) === subject) return "help";
        };
        if (peers.some((peer) => !role(peer))) continue;
        const titles = scan(root, fixedTitles, 120);
        if (!titles) continue;
        const matches = titles.filter((node) => fixedName2(node) === title && !!(list.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
        const heading2 = matches.length === 1 ? matches[0] : void 0;
        if (!heading2) continue;
        const listRegion = list.closest('section,[role~="region" i]');
        if (heading2.closest('section,[role~="region" i]') !== listRegion) continue;
        let category = peers.includes(candidate.element) ? role(candidate.element) : void 0;
        if (!category) {
          const entry = compact(ownName).replace(/\([^)]*\)/g, "").replace(/바로가기$/, "");
          if (!peers.includes(candidate.element) && entry === compact(title) && !!(heading2.compareDocumentPosition(candidate.element) & Node.DOCUMENT_POSITION_FOLLOWING)) category = "apply";
        }
        if (category) return evidence3(
          candidate,
          "current-local-task-roles",
          category,
          category === "help" ? "reading" : "control",
          [root, list, ...peers, heading2, ...peers.map((peer) => peer.parentElement)],
          [heading2],
          title
        );
      }
    }
  }
  function supportView(candidate) {
    if (!mediaView.test(name(candidate.element).replace(/\s*선택됨$/, ""))) return;
    const group = candidate.element.parentElement;
    if (!group || group.childElementCount < 2 || group.childElementCount > 6 || group.querySelector(editable5)) return;
    const peers = [...group.children];
    if (!peers.every((peer) => peer instanceof HTMLElement && peer.matches(controls) && safeControl(peer) && mediaView.test(name(peer).replace(/\s*선택됨$/, "")))) return;
    const owner = group.parentElement;
    const previous = group.previousElementSibling;
    const content = group.nextElementSibling;
    if (!owner || !previous || !(previous instanceof HTMLElement) || !(content instanceof HTMLElement) || previous.matches(`section,${excluded3},${editable5}`) || content.matches(`${excluded3},${editable5}`)) return;
    const titles = previous.matches(headings3) ? [previous] : scan(previous, headings3, 60);
    const title = titles?.filter((node) => /(?:지원|상담)\s*센터|상담소|support\s*(?:center|centre)/i.test(fixedName2(node)));
    if (title?.length !== 1) return;
    const tables = scan(content, "table", 350);
    if (!tables || tables.length !== 1) return;
    const table = tables[0];
    const cells = [...table.querySelectorAll("thead th")];
    const titleCells = cells.filter((node) => !node.querySelector(`${editable5},${controls}`) && /^(?:제목|자료명|title)$/i.test(name(node)));
    const rows = [...table.querySelectorAll("tbody tr")];
    if (titleCells.length !== 1 || rows.length < 1 || rows.length > 30 || table.querySelector(editable5)) return;
    const links = rows.flatMap((row) => [...row.querySelectorAll("a[href]")]);
    if (!links.length || links.length > 30 || !links.every(safeControl)) return;
    return evidence3(
      candidate,
      "support-content-reading-views",
      "help",
      "reading",
      [owner, group, previous, content, title[0], table, ...cells, ...rows, ...peers, ...links],
      [title[0], ...titleCells],
      fixedName2(title[0])
    );
  }
  function serviceCard(candidate) {
    const label = name(candidate.element);
    if (!details.test(label) && !issue.test(label) && !preview.test(label)) return;
    const card = candidate.element.closest('li,[role~="listitem" i],section,[role~="group" i]');
    if (!card || card.closest(`${excluded3},${editable5}`) || card.querySelector(`${editable5},form,[role~="form" i]`)) return;
    const nodes = scan(card, `${controls},${fixedTitles}`, 100);
    if (!nodes) return;
    const peers = nodes.filter((node) => node.matches(controls));
    const titles = nodes.filter((node) => node.matches(fixedTitles) && !!fixedName2(node));
    if (peers.length !== 3 || titles.length !== 1 || !peers.includes(candidate.element) || !peers.every(safeControl)) return;
    const title = titles[0];
    const topic = fixedName2(title);
    if (!/증명|확인서|영수증|내역서|certificate|statement|receipt|record/i.test(topic) || !(title.compareDocumentPosition(peers[0]) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
    if (peers.filter((peer) => details.test(name(peer))).length !== 1 || peers.filter((peer) => issue.test(name(peer))).length !== 1 || peers.filter((peer) => preview.test(name(peer))).length !== 1) return;
    if (peers.some((peer) => {
      const metadata = normalize3(peer.getAttribute("title") ?? "").replace(/^\(?(?:새창열림|새\s*창|new\s*window)\)?\s*/i, "");
      return !!metadata && metadata !== name(peer) && metadata !== `${topic} ${name(peer)}`;
    })) return;
    const category = issue.test(label) ? "apply" : "help";
    return evidence3(
      candidate,
      "single-service-own-actions",
      category,
      category === "apply" ? "control" : "reading",
      [card, title, ...peers],
      [title],
      topic
    );
  }
  function serviceRelation(candidate, _cache) {
    const element = candidate.element;
    if (candidate.context === "footer" || !element.matches(controls) || !safeControl(element) || candidateLabel(element) !== candidate.label) return;
    return serviceCard(candidate) ?? supportView(candidate) ?? localTask(candidate);
  }

  // src/document-relations.ts
  var editable6 = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
  var excluded4 = 'header,footer,nav,aside,article,form,[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i],[role~="complementary" i],[role~="article" i],[role~="form" i]';
  var controls2 = 'a[href],button,[role~="button" i],[role~="tab" i]';
  var headings4 = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
  var normalize4 = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  var preparation = /서식|신청서|신고서|동의서|청구서|작성\s*(?:예|견본)|\b(?:application|consent|request)\s+forms?\b/i;
  var operation = /신청|예약|접수|로그인|인증|제출|결제|납부|구매|삭제|탈퇴|(?:발급|지급|조회)\s*하기|\b(?:apply|reserve|submit|login|checkout|payment|delete)\b/i;
  var documentKind2 = /(?:가이드북|안내\s*책자|안내서|설명서|매뉴얼|편람|지침서|핸드북|업무\s*가이드|\b(?:guidebook|handbook|manual))\s*(?:\([^()]{1,30}\))?$/i;
  var support = /장학(?:금)?|학자금|학업\s*지원|학생\s*지원|학비\s*지원|\b(?:scholarship|student\s+(?:finance|support|funding))\b/i;
  var regulation = /규정|규칙|(?:시행|운영)?\s*세칙|\b(?:regulations?|rules?|bylaws?)\b/i;
  var interactive = 'button,input,textarea,select,form,[contenteditable]:not([contenteditable="false" i]),' + ["button", "tab", "checkbox", "radio", "switch", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "treeitem", "listbox", "tree", "menu", "menubar", "grid", "scrollbar", "radiogroup", "tablist"].map((role) => `[role~="${role}" i]`).join(",");
  function fixedName3(element, own = false) {
    if (!isVisible(element) || element.closest(`${editable6},${excluded4}`) || element.hasAttribute("aria-labelledby") || !own && element.matches(`${interactive},${controls2}`)) return "";
    const pending = [...element.children];
    let visits = 0;
    while (pending.length) {
      const node = pending.pop();
      if (++visits > 64 || node.matches(`${editable6},form,[aria-labelledby]`) || !own && node.matches(`${interactive},${controls2}`) || node instanceof HTMLElement && !isVisible(node)) return "";
      pending.push(...node.children);
    }
    return normalize4(own ? candidateLabel(element) : getSafeLabel(element));
  }
  function safeName(element, own = false) {
    const value = fixedName3(element, own);
    return value.length >= 2 && value.length <= 120 ? value : "";
  }
  function plainTable(table) {
    const pending = [...table.children];
    let visits = 0;
    while (pending.length) {
      const node = pending.pop();
      if (++visits > 2048 || node.matches(`table,${editable6},${interactive}`)) return false;
      pending.push(...node.children);
    }
    return true;
  }
  function tableProof(element) {
    const table = element.closest("table");
    if (!(table instanceof HTMLTableElement) || table.closest(`${excluded4},${editable6}`) || table.matches(interactive) || !isVisible(table) || !table.caption || !table.tHead || table.tHead.rows.length !== 1 || table.tBodies.length !== 1) return;
    const header = table.tHead;
    const headerRow = header.rows[0];
    const headers = [...headerRow.cells];
    const body = table.tBodies[0];
    const rows = [...body.rows];
    if (headers.length < 2 || headers.length > 8 || rows.length < 1 || rows.length > 80 || !plainTable(table) || headers.some((cell) => cell.tagName !== "TH" || cell.colSpan !== 1 || cell.rowSpan !== 1) || !isVisible(header) || !isVisible(body)) return;
    const captionName = safeName(table.caption);
    if (!captionName) return;
    const names = headers.map((cell) => safeName(cell));
    if (names.some((name2) => !name2)) return;
    return { table, caption: table.caption, captionName, header, headerRow, headers, names, body, rows };
  }
  function column(proof2, pattern) {
    const matches = proof2.names.map((name2, index) => pattern.test(name2) ? index : -1).filter((index) => index >= 0);
    return matches.length === 1 ? matches[0] : void 0;
  }
  function simpleRow(proof2, element) {
    const row = element.closest("tr");
    if (!(row instanceof HTMLTableRowElement) || row.parentElement !== proof2.body || !proof2.rows.includes(row) || row.querySelector("table") || !isVisible(row)) return;
    const cells = [...row.cells];
    if (cells.length !== proof2.headers.length || cells.some((cell) => cell.colSpan !== 1 || cell.rowSpan !== 1 || !isVisible(cell))) return;
    return cells;
  }
  function tableNodes(proof2) {
    return [proof2.table, proof2.caption, proof2.header, proof2.headerRow, ...proof2.headers, proof2.body];
  }
  function proof(candidate, rule, category, dependencies, fixedNames, tokens, relatedLabel) {
    const nodes = evidenceNodes([
      candidate.element,
      ...dependencies,
      ...dependencies.flatMap((node) => node.parentElement ? [node.parentElement] : [])
    ], fixedNames);
    if (!nodes) return;
    const named = new Set(fixedNames);
    return {
      rule,
      category,
      score: 70,
      pageTask: "reading",
      contentScope: "content",
      ...relatedLabel ? { relatedLabel } : {},
      dependencies: nodes,
      // Source snapshot/current action owns href, target and script safety. No
      // document numbers, opaque query values or source script enter this proof.
      fingerprint: JSON.stringify([
        rule,
        category,
        candidate.label,
        candidate.action,
        tokens,
        relatedLabel ?? "",
        nodes.map((node) => [
          node.tagName,
          ...["class", "role", "aria-current", "aria-selected", "aria-expanded", "aria-hidden", "hidden", "rowspan", "colspan"].map((name2) => node.getAttribute(name2)),
          named.has(node) ? safeName(node, node.matches(controls2)) : ""
        ])
      ])
    };
  }
  function listedDocument(candidate, table) {
    const element = candidate.element;
    if (!documentKind2.test(candidate.label) || preparation.test(candidate.label) || /(?:발간|제작|배포)\s*(?:행사|보도|소식)|뉴스|기사|채용|입찰/.test(candidate.label)) return;
    const title = column(table, /^(?:제목|문서명|자료명|title|document)$/i);
    const date = column(table, /^(?:작성일|등록일|게시일|발행일|date|published)$/i);
    const attachment = column(table, /^(?:첨부(?:파일)?|파일|attachments?|files?)$/i);
    const department = column(table, /^(?:부서|담당부서|작성부서|department)$/i);
    const cells = simpleRow(table, element);
    if (title === void 0 || date === void 0 || attachment === void 0 || department === void 0 || (/* @__PURE__ */ new Set([title, date, attachment, department])).size !== 4 || !cells || cells[title] !== element.closest("td,th") || cells[title].querySelectorAll(controls2).length !== 1 || cells[title].querySelector(interactive) || cells.some((cell, index) => index !== title && cell.querySelector(controls2))) return;
    const row = element.closest("tr");
    return proof(
      candidate,
      "listed-fixed-document-kind",
      "help",
      [...tableNodes(table), row, ...cells],
      [table.caption, ...table.headers, element],
      ["title-date-department-attachment", "own-document-kind"]
    );
  }
  function directoryRows(table, floor) {
    const grid = Array.from({ length: table.rows.length }, () => []);
    const nodes = [];
    for (const [rowIndex, row] of table.rows.entries()) {
      if (!isVisible(row) || row.querySelector("table")) return;
      nodes.push(row);
      let index = 0;
      for (const cell of row.cells) {
        while (grid[rowIndex][index]) index++;
        if (index >= table.headers.length || cell.colSpan !== 1 || !isVisible(cell) || cell.rowSpan < 1 || cell.rowSpan > table.rows.length - rowIndex || cell.rowSpan !== 1 && index !== floor) return;
        nodes.push(cell);
        for (let offset = 0; offset < cell.rowSpan; offset++) {
          if (grid[rowIndex + offset][index]) return;
          grid[rowIndex + offset][index] = cell;
        }
        index++;
      }
      if (grid[rowIndex].length !== table.headers.length || table.headers.some((_, columnIndex) => !grid[rowIndex][columnIndex])) return;
    }
    return { grid, nodes };
  }
  function directory(candidate, table) {
    if (!/(?:자료실|열람실|시설|공간).{0,16}(?:이용\s*안내|사용\s*안내)|\b(?:room|facility)\s+(?:information|directory|guide)\b/i.test(table.captionName) || /예약|신청|결제|대여|구매|\b(?:booking|reservation|payment)\b/i.test(table.captionName)) return;
    const floor = column(table, /^(?:층수|층|위치|floor|location)$/i);
    const kind = column(table, /^(?:구분|유형|종류|type)$/i);
    const name2 = column(table, /^(?:자료\s*설명|시설명|공간명|자료실명|name|description)$/i);
    const contact = column(table, /^(?:이용\s*문의|문의|연락처|contact)$/i);
    if (floor === void 0 || kind === void 0 || name2 === void 0 || contact === void 0 || (/* @__PURE__ */ new Set([floor, kind, name2, contact])).size !== 4 || table.headers.length !== 4) return;
    const rows = directoryRows(table, floor);
    const row = candidate.element.closest("tr");
    const index = row ? table.rows.indexOf(row) : -1;
    const cells = rows?.grid[index];
    if (!rows || !row || !cells || cells[name2] !== candidate.element.closest("td,th") || cells[name2].rowSpan !== 1 || cells[name2].querySelectorAll(controls2).length !== 1 || cells[name2].querySelector(interactive) || row.querySelectorAll(controls2).length !== 1 || operation.test(candidate.label) || candidate.label.length > 70) return;
    return proof(
      candidate,
      "aligned-information-directory",
      "help",
      [...tableNodes(table), ...rows.nodes],
      [table.caption, ...table.headers, candidate.element],
      ["unique-descriptive-column", "readonly-directory", "floor-only-rowspan"]
    );
  }
  function canonicalRule(value) {
    return normalize4(value).replace(/\s*(?:다운로드|내려\s*받기|download)\s*$/i, "").replace(/(?:시행|운영)\s*세칙/g, "\uC138\uCE59").replace(/\s+/g, "").toLocaleLowerCase();
  }
  function academicDocument2(candidate, table) {
    const element = candidate.element;
    if (candidate.action !== "locate" || !element.matches("a[href]") || !/^(?:pdf\s*(?:파일\s*)?(?:다운로드|내려\s*받기|download)|(?:파일\s*)?(?:다운로드|download)\s*\(?pdf\)?)$/i.test(candidate.label) || !support.test(table.captionName) || !regulation.test(table.captionName) || preparation.test(table.captionName)) return;
    const title = column(table, /^(?:구분|문서명|자료명|제목|title|document)$/i);
    const download = column(table, /^(?:파일\s*\(\s*pdf\s*\)\s*(?:다운로드|내려\s*받기)|pdf\s*(?:다운로드|download)|download\s*\(\s*pdf\s*\))$/i);
    const cells = simpleRow(table, element);
    if (title === void 0 || download === void 0 || title === download || !cells || cells[download] !== element.closest("td,th") || cells[download].querySelectorAll(controls2).length !== 1 || cells[title].querySelector(controls2) || element.closest("tr")?.querySelectorAll(controls2).length !== 1) return;
    const rowTitle = safeName(cells[title]);
    const authoredTitle = normalize4(element.getAttribute("title") ?? "");
    if (!rowTitle || !support.test(rowTitle) || !regulation.test(rowTitle) || preparation.test(rowTitle) || !authoredTitle || authoredTitle.length > 120 || !support.test(authoredTitle) || !regulation.test(authoredTitle) || preparation.test(authoredTitle) || canonicalRule(rowTitle) !== canonicalRule(authoredTitle)) return;
    const row = element.closest("tr");
    return proof(
      candidate,
      "academic-support-regulation-file",
      "academic",
      [...tableNodes(table), row, ...cells],
      [table.caption, ...table.headers, cells[title], element],
      [authoredTitle, "fixed-row-document-title", "pdf-download-column"],
      rowTitle
    );
  }
  function selected3(element) {
    return [element, element.parentElement].some((node) => !!node && (/^(?:page|true)$/i.test(node.getAttribute("aria-current") ?? "") || /^true$/i.test(node.getAttribute("aria-selected") ?? "") || /(?:^|\s)(?:active|selected|current|is-active)(?:\s|$)/i.test(node.getAttribute("class") ?? "")));
  }
  function readingURL(element) {
    if (element.matches("[onclick],[aria-controls],[aria-expanded],[aria-haspopup]")) return;
    try {
      const url = new URL(element.getAttribute("href") ?? "", document.baseURI);
      return /^https?:$/.test(url.protocol) && url.origin === location.origin ? url : void 0;
    } catch {
      return;
    }
  }
  function headingKey(value) {
    return normalize4(value).replace(/\s*\([^()]{1,30}\)\s*$/, "").replace(/\s+/g, "").toLocaleLowerCase();
  }
  function localHeadings(root) {
    const pending = [...root.children].map((node) => ({ node, depth: 0 }));
    const found = [];
    let visits = 0;
    while (pending.length) {
      if (++visits > 80) return [];
      const { node, depth } = pending.shift();
      if (!(node instanceof HTMLElement) || node.matches(`${excluded4},${editable6},ul,ol,table`)) continue;
      if (node.matches(headings4)) {
        if (safeName(node)) found.push(node);
        continue;
      }
      if (depth < 2 && !node.matches('section,[role~="region" i]')) pending.push(...[...node.children].map((child) => ({ node: child, depth: depth + 1 })));
    }
    return found;
  }
  function academicTabs2(candidate) {
    const element = candidate.element;
    if (candidate.action !== "navigate" || !element.matches("a[href]") || !support.test(candidate.label) || operation.test(candidate.label) || preparation.test(candidate.label)) return;
    const list = element.closest('ul,ol,[role~="list" i],[role~="tablist" i]');
    if (!list || list.childElementCount < 2 || list.childElementCount > 12 || list.querySelector(`${editable6},form`)) return;
    const peers = [...list.querySelectorAll(':scope > li > a[href],:scope > [role~="listitem" i] > a[href]')];
    if (peers.length !== list.childElementCount || !peers.includes(element) || peers.some((peer) => !safeName(peer, true) || !support.test(safeName(peer, true)) || operation.test(safeName(peer, true)) || preparation.test(safeName(peer, true)) || !readingURL(peer) || peer.parentElement?.querySelectorAll(controls2).length !== 1)) return;
    const active = peers.filter(selected3);
    if (active.length !== 1) return;
    const current = readingURL(active[0]);
    if (!current || current.pathname !== location.pathname || current.search !== location.search) return;
    for (let wrapper = list, depth = 0; wrapper && depth < 5; wrapper = wrapper.parentElement, depth++) {
      if (wrapper.matches(`html,body,${excluded4},${editable6}`)) break;
      const region = wrapper.nextElementSibling;
      if (!(region instanceof HTMLElement) || !region.matches('section,[role~="region" i]') || region.closest(`${excluded4},${editable6}`) || !isVisible(region)) continue;
      const titles = localHeadings(region).filter((title) => support.test(safeName(title)) && headingKey(safeName(title)) === headingKey(safeName(active[0], true)));
      if (titles.length !== 1) continue;
      const owner = wrapper.parentElement;
      if (!owner) continue;
      const pageTitles = localHeadings(owner).filter((title) => !wrapper.contains(title) && !region.contains(title) && /학사|학업|학생|\bacademic\b/i.test(safeName(title)) && support.test(safeName(title)) && !!(title.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (pageTitles.length !== 1) continue;
      return proof(
        candidate,
        "selected-academic-support-documents",
        "academic",
        [owner, wrapper, region, list, ...titles, ...pageTitles, ...peers, ...peers.map((peer) => peer.parentElement)],
        [...titles, ...pageTitles, ...peers],
        ["unique-current-document", "matching-fixed-content-heading", "academic-support-owner"]
      );
    }
  }
  function documentRelation2(candidate, _cache) {
    const element = candidate.element;
    if (candidate.context === "footer" || !element.matches("a[href],button") || !isVisible(element) || element.closest(`${editable6},${excluded4}`) || element.querySelector(editable6) || element.hasAttribute("aria-labelledby") || safeName(element, true) !== candidate.label || element instanceof HTMLButtonElement && (element.type !== "button" || !!element.form)) return;
    const table = tableProof(element);
    if (table) return academicDocument2(candidate, table) ?? directory(candidate, table) ?? listedDocument(candidate, table);
    return academicTabs2(candidate);
  }

  // src/relations.ts
  var createRelationCache = () => ({ service: /* @__PURE__ */ new WeakMap(), document: /* @__PURE__ */ new WeakMap() });
  function relationEvidence(candidate, cache) {
    return documentRelation2(candidate, cache?.document) ?? serviceRelation(candidate, cache?.service);
  }

  // src/classifier.ts
  var rules = [
    { category: "login", label: /로그인|\b(?:log[\s-]*in|sign[\s-]*in)\b/i, section: /^(?:로그인|log[\s-]*in|sign[\s-]*in)$/i, endpoints: /* @__PURE__ */ new Set(["login", "signin"]) },
    { category: "search", label: /검색|\bsearch\b/i, section: /^(?:(?:통합|자료|정보)?\s*검색|search)$/i, endpoints: /* @__PURE__ */ new Set(["search"]) },
    { category: "notice", label: /공지|새\s*소식|소식\s*알림|\b(?:notices?|noticeboard|announcements?)\b/i, section: /^(?:(?:(?:통합|주요|전체)\s*)?공지(?:사항)?|새\s*소식|소식\s*알림|notices?|noticeboard|announcements?)$/i, endpoints: /* @__PURE__ */ new Set(["notice", "notices", "announcement", "announcements"]) },
    { category: "academic", label: /학사|샘물|수강|학적|성적조회|등록금|\bacademics?\b|\bstudent\s+portal\b/i, section: /^(?:학사(?:정보|안내|일정)?|샘물|수강(?:신청|안내)?|학적|성적조회|등록금|academics?|student\s+portal)$/i, endpoints: /* @__PURE__ */ new Set(["academic", "academics", "haksa", "sugang"]) },
    { category: "help", label: /이용\s*안내|도움말|자주\s*(?:묻는|하는|찾는)\s*질문|검색\s*(?:방법|안내)|뷰어\s*(?:설치\s*)?(?:다운로드|프로그램\s*안내)|(?:민원실|상담)\s*(?:안내|운영)|\b(?:faq|help)\b|\bq\s*&\s*a\b|\bcontact\s+us\b|\buser\s+guide\b|\bsearch\s+(?:help|guide|tips?|instructions)\b|\bviewer\s+(?:install\s+)?download\b/i, section: /^(?:이용\s*안내|도움말|자주\s*(?:묻는|하는|찾는)\s*질문(?:\s*\(FAQ\))?|문의|검색\s*(?:방법|안내)|뷰어\s*(?:설치\s*)?(?:다운로드|프로그램\s*안내)|(?:민원실|상담)\s*(?:안내|운영)|faq|help|q\s*&\s*a|contact\s+us|user\s+guide|search\s+(?:help|guide|tips?|instructions)|viewer\s+(?:install\s+)?download)$/i, endpoints: /* @__PURE__ */ new Set(["help", "faq"]) },
    { category: "apply", label: /신청|접수|예약|조회|\b(?:apply|applications?|reservations?|booking)\b/i, section: /^(?:신청(?:\s*[·/]\s*조회)?|접수|예약|조회|apply|applications?|reservations?|booking)$/i, endpoints: /* @__PURE__ */ new Set(["apply", "application", "reservation", "booking"]) }
  ];
  var normalize5 = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  var dangerous2 = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;
  var actionKeys = ["action", "cmd", "command", "mode", "task", "event", "method", "operation", "do"];
  var riskyFlagKeys = /* @__PURE__ */ new Set(["logout", "signout", "delete", "remove", "payment", "checkout", "final_submit"]);
  var ambiguousLabel = /^(?:더\s*보기|바로\s*가기|자세히\s*보기|more|read\s*more|open)$/i;
  var decoratedMoreLabel = /^.+(?:더\s*보기|\bread\s*more|\bmore)$/i;
  var searchGuidanceLabel = /검색\s*(?:방법|안내|도움말)|\bsearch\s+(?:help|guide|tips?|instructions)\b/i;
  var explicitApplication = /신청|접수|예약|\b(?:apply|applications?|reservations?|booking)\b/i;
  var inquiryWord = /^(?:(?:고객|이용|서비스|민원|상담|전화|온라인|예약|신청|제품|사용|일반))?문의(?:하기|처|사항|안내|게시판)?$/;
  var publicNoticeList = /^(?:공고\s*[/·]\s*고시|고시\s*[/·]\s*공고|공고|고시)(?:\s*(?:목록|바로\s*가기))?$/;
  var ebookLabel = /^(?:전자책\s*(?:보기|읽기)|e\s*book\s*(?:open|view|read))$/i;
  var helpHandoff = /^.{0,40}(?:홈페이지\s*바로\s*가기|(?:go\s+to|visit|open)\s+(?:the\s+)?(?:website|home\s*page))$/i;
  var calendarView = /^(?:(?:달력|리스트|목록)(?:으로|로)?\s*일정\s*보기|view\s+schedule\s+as\s+(?:calendar|list)|(?:calendar|list)\s+view)$/i;
  var academicEvent = /학기|고사|시험|수업|강의|개강|종강|방학|학사|등록|졸업|입학|수강/;
  var noticeCollection = /^(?:(?:공지(?:사항)?|새\s*소식)\s*더\s*보기|(?:notices?|announcements?)\s+(?:read\s*)?more)$/i;
  var viewerControl = /뷰어\s*(?:설치\s*)?다운로드|\bviewer\s+(?:install\s+)?download\b/i;
  var orderingLabel = /^(?:조회|검색|신청|예약|등록)(?:\s*수)?\s*순$/;
  var pageToolLabel = /^(?:(?:url|주소)\s*복사(?:하기)?|(?:프린트|인쇄)(?:하기)?|(?:전자\s*)?점자\s*(?:솔루션|다운로드|뷰어\s*보기)(?:\s*\(새\s*창\s*열림\))?|(?:주|서브|사이드|전체)?\s*메뉴\s*바로\s*가기|(?:상단\s*)?배너\s*모두\s*보기|(?:sns\s*)?공유(?:하기)?)$/i;
  var contactHelp = /^(?:(?:조직(?:도)?\s*(?:및|[·/&])\s*)?(?:(?:담당\s*)?(?:부서|직원|담당자)\s*)?(?:전화번호|연락처)\s*(?:안내|찾기)?|조직도(?:\s*안내)?|(?:staff|department|contact)\s+(?:directory|contacts?))$/i;
  var locationAction = /^(?:(?:찾아\s*)?오시는\s*길(?:\s*안내)?|캠퍼스\s*(?:맵|지도)|지도\s*보기|(?:kakao|카카오|naver|네이버)\s*(?:맵|지도)\s*(?:으로|로)?\s*(?:이동|보기)(?:\s*\(새\s*창\s*(?:열림)?\))?|(?:담당자|직원|부서)\s*(?:찾기|검색)|(?:교내\s*)?전화번호\s*(?:검색|찾기)|directions|campus\s+map)$/i;
  var locationGuide = /^(?:청사|층별|주차|캠퍼스)\s*안내$/;
  var hoursHelp = /^(?:(?:이용|운영|개관|업무)\s*시간(?:\s*안내)?|휴관일(?:\s*안내)?|(?:opening|business|service)\s+hours)$/i;
  var formTitle = /(?:신청서|신고서|위임장|동의서|청구서|\b(?:application|declaration|authorization|consent|claim)\s+form)$/i;
  var formDownload = /(?:(?:신청서|신고서|위임장|동의서|청구서)\s*(?:다운로드|다운\s*받기)|\bdownload\s+(?:application|declaration|authorization|consent|claim)\s+form)$/i;
  var formsHeading = /^(?:(?:민원|신청)?\s*서식(?:\s*(?:자료|목록|안내))?|forms?(?:\s+(?:library|downloads?))?)$/i;
  var preparationHeading = /^(?:(?:신청서|신고서|청구서|서식)\s*(?:및|[·/&])\s*)?(?:구비|제출|준비)\s*서류(?:\s*(?:목록|안내))?$/;
  var procedureHeading = /^(?:.{1,24})?(?:발급|신청|신고)(?:\s*(?:안내|절차))?$|^(?:application|issuance|registration)(?:\s+(?:guide|procedure|steps))?$/i;
  var issuanceIntent = /^(?=.{2,36}$).*(?:재\s*)?발급(?:\s*(?:신청|안내|방법|절차))?(?:\s*바로\s*가기)?$/;
  var branchDirectory = /^(?:(?:지사|지점|센터|본부|부서|사업소|사무소)(?:\s*[/·&]\s*(?:지사|지점|센터|본부|부서|사업소|사무소))*\s*(?:전체\s*보기|목록|찾기|안내)|(?:branch(?:es)?|offices?|service\s+centers?)\s+(?:directory|locations?))$/i;
  var academicConcept = /수업|강의|학기|출결|출석|성적|이수|학점|학위|졸업|입학|전공|교양|휴학|복학/;
  var academicGuideEnd = /(?:수업|강의|학기|출결|출석|성적|이수|학점|학위|졸업|입학|전공|교양|휴학|복학|안내|지침|제도|시간표|일정|규정|요람|과정)(?:\s*바로\s*가기)?$/;
  var interrogative = /(?:[?？]|(?:인가요|하나요|되나요|있나요|합니까|됩니까|하습니까)\s*\.?)$/;
  var answerToggle = /^(?:답변\s*(?:열기|보기|펼치기)|(?:open|view|show|expand)\s+answer)$/i;
  var documentExtension = /\.(?:pdf|hwp|hwpx|docx?|xlsx?|pptx?|odt|rtf)$/i;
  var legalDocument = /(?:조례|규정|법령)(?:\s*(?:안내|해설|집))?(?:\s*[\[(][^\])]{1,24}[\])])?$|별표\s*\d+(?:\s*\])?$/;
  var noticeListHeading = /^(?:공지\s*공고|(?:채용|입찰|모집)\s*공고)(?:\s*(?:목록|게시판))?$/;
  var studentContextHeading = /^(?:학생지원|대학생활|학교생활|student\s+(?:support|life)|campus\s+life)$/i;
  var counselingControl = /^(?:(?:무료|온라인|전화|방문|대면|비대면)\s*)?상담\s*(?:운영|안내)$/;
  var applicationControlLabel = /^(?=.{2,36}$)[^.!?。？]{0,28}(?:신청|예약|접수)(?:\s*(?:(?:내역|결과|현황)\s*)?(?:확인|조회))?(?:\s*(?:하기|하러\s*가기|바로\s*가기))?$|^(?:apply(?:\s+now)?|reservations?|booking)$/i;
  var issuanceServiceHeading = /^(?=.{2,48}$)(?:(?:온라인|인터넷|전자)\s*)?(?:(?:증명(?:서)?|민원|서류)\s*)?발급\s*(?:시스템|서비스)(?:\s*(?:바로\s*가기|목록))?$/;
  function hasDangerousScript(element) {
    const raw = element.getAttribute("href")?.trim() ?? "";
    const script = [element.getAttribute("onclick") ?? "", /^javascript:/i.test(raw) ? raw : ""].join(" ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
    return dangerous2.test(script);
  }
  function contextsFor(candidate, label) {
    return [candidate.sectionLabel, ...candidate.contextLabels ?? []].filter((value) => !!value).map(normalize5).filter((value) => value !== label);
  }
  function hasAcademicContext(candidate, label) {
    const academic = rules.find((rule) => rule.category === "academic");
    return contextsFor(candidate, label).some((value) => {
      if (value.length > 60) return false;
      if (academic.section.test(value) || studentContextHeading.test(value)) return true;
      const pieces = value.split(/[\s·/|]+/).filter(Boolean);
      return pieces.length <= 3 && pieces.every((piece) => academic.section.test(piece) || studentContextHeading.test(piece));
    });
  }
  function academicInformation(candidate, label, target, url) {
    return !!url && candidate.action === "navigate" && candidate.element.matches("a[href]") && candidate.context !== "footer" && !candidate.element.closest('article, [role~="article"]') && /납부\s*(?:안내|방법|절차|일정)$/.test(label) && !dangerous2.test(label.replace(/납부/g, "")) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(target)) && hasAcademicContext(candidate, label);
  }
  function academicReading(candidate, label, target, url) {
    return !!url && candidate.action === "navigate" && candidate.element.matches("a[href]") && candidate.context !== "footer" && !candidate.element.closest('header, article, [role~="banner"], [role~="article"]') && label.length <= 36 && !/[.!?。？]/.test(label) && !!candidate.element.closest('nav, li, tr, [role~="navigation"], [role~="listitem"], [role~="row"]') && academicConcept.test(label) && academicGuideEnd.test(label) && hasAcademicContext(candidate, label) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(target));
  }
  function academicLocalDestination(candidate, label, target, url) {
    return !!url && candidate.action === "navigate" && candidate.element.matches("a[href]") && candidate.context !== "footer" && !candidate.element.closest('header, article, [role~="banner"], [role~="article"]') && label.length >= 2 && label.length <= 24 && !/[.!?。？]/.test(label) && !/^\d+$/.test(label) && !/(?:발표|보도|기사|연구\s*(?:결과|성과)?)$/.test(label) && !hasDocumentReference(url) && !/^\d+(?:\.[a-z]+)?$/i.test(pathParts(url).at(-1) ?? "") && !!candidate.element.closest('nav, li, [role~="navigation"], [role~="listitem"]') && hasAcademicContext(candidate, label) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(target));
  }
  function formReading(candidate, label, target, url) {
    if (candidate.context === "footer" || candidate.element.closest('article, [role~="article"]')) return;
    const contexts = contextsFor(candidate, label);
    const listed = !!candidate.element.closest('tr, li, [role~="row"], [role~="listitem"]');
    const document2 = !!url && candidate.action === "navigate" && candidate.element.matches("a[href]") && listed && formTitle.test(label) && contexts.some((value) => formsHeading.test(value));
    const download = candidate.action === "locate" && candidate.element.matches('a, button, [role~="button"]') && !!candidate.element.closest("ol") && listed && formDownload.test(label) && contexts.some((value) => value.length <= 40 && procedureHeading.test(value));
    const preparation2 = candidate.action === "locate" && candidate.element.matches("a[href]") && listed && isDocumentDownload(candidate.element, candidate.label) && formTitle.test(label) && contexts.some((value) => formsHeading.test(value) || preparationHeading.test(value));
    if (!document2 && !download && !preparation2) return;
    if (rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return "conflict";
    return document2 ? "document" : "download";
  }
  function pathParts(url) {
    return url.pathname.split("/").filter(Boolean).map((part) => {
      try {
        return normalize5(decodeURIComponent(part)).toLowerCase();
      } catch {
        return part.toLowerCase();
      }
    });
  }
  function isDangerousURL(url, parts) {
    if (parts.some((part) => dangerous2.test(part.replace(/[_.-]/g, " ")))) return true;
    for (const key of url.searchParams.keys()) {
      const folded = key.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
      if (riskyFlagKeys.has(folded)) return true;
      if (actionKeys.includes(folded) && url.searchParams.getAll(key).some((value) => {
        const command = normalize5(value);
        return dangerous2.test(command) || /^(?:submit|final[\s_-]*submit|submit[\s_-]*final)$/i.test(command);
      })) return true;
    }
    return false;
  }
  function endpoint(parts) {
    const names = parts.map((part) => part.replace(/\.(?:html?|php|aspx?|jsp|do)$/i, ""));
    const last = names.at(-1) ?? "";
    return /^(?:index|list|main)$/.test(last) ? names.at(-2) ?? "" : last;
  }
  function isSafeNavigation(candidate) {
    if (candidate.action !== "navigate" || !candidate.href || !candidate.element.matches("a[href]") || hasDangerousScript(candidate.element)) return false;
    try {
      const url = new URL(candidate.href);
      return /^https?:$/.test(url.protocol) && !isDangerousURL(url, pathParts(url));
    } catch {
      return false;
    }
  }
  function isSafeSource(candidate) {
    if (!candidate.element.matches('a[href], button, [role~="button" i]') || hasDangerousScript(candidate.element)) return false;
    if (dangerous2.test(normalize5(candidate.label))) return false;
    return candidate.action !== "navigate" || isSafeNavigation(candidate);
  }
  function hasDocumentReference(url) {
    return actionKeys.some((key) => /^(?:view|detail|read)$/i.test(url.searchParams.get(key) ?? "")) || ["articleNo", "articleId", "article_no", "article_id", "postNo", "postId", "post_no", "post_id"].some((key) => url.searchParams.has(key));
  }
  function noticeDocumentEvidence(candidate, label, section, target, url) {
    if (candidate.context === "footer" || label.length < 4 || /^\d+$/.test(label) || ambiguousLabel.test(label) || decoratedMoreLabel.test(label)) return;
    const notice = rules.find((rule) => rule.category === "notice");
    if (url && notice.endpoints.has(target) && hasDocumentReference(url)) return "endpoint";
    if (candidate.element.closest('article, [role~="article"]')) return;
    const listedLink = candidate.element.matches("a[href]") && !!candidate.element.closest('tr, li, [role~="row"], [role~="listitem"]');
    if (!listedLink || ![section, ...candidate.contextLabels ?? []].some((value) => notice.section.test(normalize5(value)) || noticeListHeading.test(normalize5(value)))) return;
    if (rules.some((rule) => rule.category !== "notice" && rule.endpoints.has(target))) return "conflict";
    return "collection";
  }
  function isArticle(candidate, parts, url) {
    if (candidate.context === "body" && candidate.action === "navigate" && candidate.element.closest('article, [role~="article"]')) return true;
    if (url && rules.some((rule) => rule.category === "notice" && rule.endpoints.has(endpoint(parts)))) {
      if (hasDocumentReference(url)) return true;
    }
    const articlePath = parts.some((part) => /^(?:news|articles?|stories|story|press)$/.test(part));
    const listLeaf = /^(?:news|articles?|stories|story|press|index|list|main)(?:\.[a-z]+)?$/.test(parts.at(-1) ?? "");
    return articlePath && !listLeaf;
  }
  function corroboratedArticleService(candidate, label, target, parts, url) {
    if (!url || candidate.context !== "body" || candidate.action !== "navigate" || !candidate.element.matches("a[href]") || !candidate.element.closest('article, [role~="article"]') || hasDocumentReference(url) || parts.some((part) => /^(?:news|articles?|stories|story|press)$/.test(part))) return false;
    return rules.some((rule) => rule.endpoints.has(target) && (rule.category === "apply" ? applicationControlLabel.test(label) : rule.section.test(label)));
  }
  function applicationPageControl(candidate, label, target, url) {
    if (candidate.context !== "body" || !applicationControlLabel.test(label) || !candidate.element.matches('a[href], button, [role~="button"], input[type="button"], input[type="submit"]') || url && hasDocumentReference(url) || isDocumentDownload(candidate.element, candidate.label) || rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return false;
    return !((candidate.element instanceof HTMLButtonElement || candidate.element instanceof HTMLInputElement) && candidate.element.type === "submit" && candidate.element.form);
  }
  function structuredContext(candidate, label, collection, url, navigationCache) {
    const element = candidate.element;
    if (navigationUtility(element, label, navigationCache)) return;
    if (!collection.kind || candidate.context === "footer" || !isInformationTopicLabel(label) || isDocumentDownload(element, candidate.label) || element.closest('header, footer, article, form, [role~="banner" i], [role~="contentinfo" i], [role~="article" i], [role~="form" i]') || (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && !!element.form) return;
    let destination3 = url;
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (!destination3 && raw && !/^(?:#|javascript:)/i.test(raw)) {
      try {
        const parsed = new URL(raw, document.baseURI);
        if (/^https?:$/.test(parsed.protocol)) destination3 = parsed;
        else return;
      } catch {
        return;
      }
    }
    if (hasDangerousScript(element)) return;
    const parts = destination3 ? pathParts(destination3) : [];
    if (destination3 && (isDangerousURL(destination3, parts) || hasDocumentReference(destination3)) || parts.some((part) => /^(?:news|articles?|stories|story|press)$/.test(part))) return;
    const target = endpoint(parts);
    const contexts = contextsFor(candidate, label);
    if (contexts.some((heading2) => issuanceServiceHeading.test(heading2)) && collection.kind === "list" && (collection.controlled || !!destination3) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) {
      return { ...candidate, category: "apply", score: 70, reasons: ["\uBC1C\uAE09 \uC11C\uBE44\uC2A4 \uC9C4\uC785", "\uBA85\uC2DC\uC801 \uBC1C\uAE09 \uC2DC\uC2A4\uD15C \uC81C\uBAA9\uACFC \uC6D0\uBCF8 \uBAA9\uB85D \uC81C\uC5B4"], pageTask: "control" };
    }
    const localReading = !!destination3 && destination3.origin === location.origin && candidate.action === "navigate";
    if (collection.peers >= 2 && (candidate.pagePurpose === "help" || collection.informationPeer) && (collection.controlled || localReading) && !rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target))) {
      return {
        ...candidate,
        category: "help",
        score: 65,
        reasons: ["\uC815\uBCF4 \uC8FC\uC81C \uC77D\uAE30", candidate.pagePurpose === "help" ? "\uB3C4\uC6C0\uB9D0\xB7\uD589\uB3D9\uC694\uB839 \uBAA9\uC801\uACFC \uC6D0\uBCF8 \uC8FC\uC81C \uBAA9\uB85D" : "\uC6D0\uBCF8 \uBAA9\uB85D\xB7\uD0ED\uACFC \uB3D9\uB8CC\uC758 \uBA85\uC2DC\uC801 \uC815\uBCF4 \uAC1C\uB150"],
        pageTask: candidate.context === "body" || candidate.action === "locate" && collection.controlled ? "reading" : void 0
      };
    }
  }
  function contextualReading(candidate, label) {
    if (candidate.context === "footer" || candidate.element.closest('article, [role~="article"]')) return;
    const contexts = [candidate.sectionLabel, ...candidate.contextLabels ?? []].filter((value) => !!value).map(normalize5);
    const helpContext = candidate.pagePurpose === "help" || contexts.some((value) => rules.find((rule) => rule.category === "help").section.test(value)) || isQuestionCollection(candidate.element);
    const term = candidate.element.closest("dt");
    const definitionQuestion = !!term?.closest("dl") && isVisible(term) && isVisible(candidate.element) && [candidate.element, term].some((element) => answerToggle.test(normalize5(element.getAttribute("title") ?? "")));
    if (definitionQuestion && label.length >= 4 && candidate.element.matches('a, button, [role~="button"]')) {
      return { category: "help", score: 72, reasons: ["\uB3C4\uC6C0\uB9D0 \uC9C8\uBB38 \uC77D\uAE30", "\uC815\uC758 \uBAA9\uB85D\uACFC \uBA85\uC2DC\uC801 \uB2F5\uBCC0 \uC5F4\uAE30 \uD45C\uC2DC"], pageTask: "reading" };
    }
    if (helpContext) {
      const questionMarker = [...candidate.element.querySelectorAll(":scope > abbr[title]")].some((marker) => marker instanceof HTMLElement && isVisible(marker) && /^(?:질문|question)$/i.test(normalize5(marker.getAttribute("title") ?? "")));
      if (label.length >= 4 && (questionMarker || interrogative.test(label)) && candidate.element.matches('a, button, [role~="button"]') && candidate.element.closest('li, tr, [role~="listitem"], [role~="row"]')) {
        return { category: "help", score: 72, reasons: ["\uB3C4\uC6C0\uB9D0 \uC9C8\uBB38 \uC77D\uAE30", "\uBA85\uC2DC\uC801 \uC9C8\uBB38 \uD45C\uC2DC\uC640 \uB3C4\uC6C0\uB9D0 \uBB38\uB9E5"], pageTask: "reading" };
      }
      if (helpHandoff.test(label)) return { category: "help", score: 70, reasons: ["\uC0C1\uC704 \uB3C4\uC6C0\uB9D0 \uC81C\uBAA9\uACFC \uD648\uD398\uC774\uC9C0 \uC5F0\uACB0 \uC81C\uC5B4"], pageTask: "control" };
    }
    if (candidate.pagePurpose !== "academic-calendar") return;
    if (candidate.element.matches('a, button, [role~="button"]') && calendarView.test(label)) {
      return { category: "academic", score: 72, reasons: ["\uD559\uC0AC\uC77C\uC815 \uBCF4\uAE30", "\uD398\uC774\uC9C0 \uBAA9\uC801\uACFC \uBA85\uC2DC\uC801 \uC77C\uC815 \uBCF4\uAE30 \uBAA8\uB4DC"], pageTask: "control" };
    }
    if (candidate.action === "locate" && candidate.element.matches("a:not([href])") && candidate.element.closest('table, [role~="grid"]') && label.length >= 4 && academicEvent.test(label)) {
      return { category: "academic", score: 60, reasons: ["\uD559\uC0AC\uC77C\uC815 \uD56D\uBAA9 \uC77D\uAE30", "\uD559\uC0AC\uC77C\uC815 \uBAA9\uC801\uACFC \uD45C \uC548\uC758 \uC6D0\uBCF8 \uD589\uC0AC"], pageTask: "reading" };
    }
  }
  function supplementalClassification(candidate, label, target, supplementalCache, url, navigationCache) {
    const element = candidate.element;
    if (navigationUtility(element, label, navigationCache)) return;
    if (candidate.context !== "body" || !element.matches('a[href], button, [role~="button" i]') || element.closest('article, [role~="article" i]')) return;
    const evidence4 = supplementalEvidence(element, supplementalCache);
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (hasDangerousScript(element)) return;
    let destination3 = url;
    if (!destination3 && raw && !/^(?:#|javascript:)/i.test(raw)) {
      try {
        destination3 = new URL(raw, document.baseURI);
      } catch {
        return;
      }
      if (!/^https?:$/.test(destination3.protocol)) return;
    }
    if (destination3 && isDangerousURL(destination3, pathParts(destination3))) return;
    if (destination3 && pathParts(destination3).some((part) => /^(?:news|articles?|stories|story|press)$/.test(part))) return;
    if (destination3) target = endpoint(pathParts(destination3));
    const result = (category, score, reason, task) => ({
      ...candidate,
      category,
      score,
      reasons: [reason, "\uACE0\uC815 \uC6D0\uBCF8 \uC81C\uC5B4 \uAD6C\uC870"],
      pageTask: task,
      supplementalDependent: true,
      relatedLabel: evidence4.relatedLabel,
      snapshot: sourceSnapshot(element, candidate.label, void 0, false, true, supplementalCache, navigationCache)
    });
    if (!dangerous2.test(label) && evidence4.filter && isInformationTopicLabel(label) && !rules.some((rule) => rule.category !== "search" && rule.endpoints.has(target))) return result("search", 70, "\uAC80\uC0C9 \uC591\uC2DD\uC758 \uBD84\uC57C \uD544\uD130", "control");
    if (evidence4.preparationAttachment && candidate.action === "locate" && element.matches("a[href]") && !!evidence4.relatedLabel && !dangerous2.test(label) && !dangerous2.test(evidence4.relatedLabel) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) {
      return result("apply", 70, "\uAC19\uC740 \uC11C\uC2DD \uD589\uC758 \uACE0\uC815 \uC81C\uBAA9\uACFC \uCCA8\uBD80 \uC790\uB8CC", "reading");
    }
    const contexts = contextsFor(candidate, label);
    if (!dangerous2.test(label) && evidence4.materialRow && label.length >= 2 && label.length <= 60 && !rules.some((rule) => !["apply", "academic"].includes(rule.category) && rule.label.test(label)) && contexts.some((text3) => /^(?=.{2,40}$).*(?:민원|신청|신고).*(?:편람|서식|준비\s*자료)$/.test(text3)) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return result("apply", 70, "\uC2E0\uCCAD \uC900\uBE44 \uD3B8\uB78C\uC758 \uC6D0\uBCF8 \uC11C\uC2DD \uC790\uB8CC", "reading");
    if (contextualReading(candidate, label)?.category === "academic" || issuanceIntent.test(label) && contexts.some((text3) => procedureHeading.test(text3))) return;
    const guideContext = contexts.some((text3) => text3.length <= 60 && /안내$/.test(text3));
    const readingContexts = [...contexts, ...evidence4.associatedHeadings];
    const guideReading = candidate.pagePurpose === "help" || readingContexts.some((text3) => text3.length <= 60 && (/(?:안내|설명서|도움말|사용\s*법|이용\s*법|가이드|요령|수칙|매뉴얼|\b(?:instructions?|guide|manual|help))$/i.test(text3) || /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|download)$/i.test(text3)));
    const academicPeer = (peer) => {
      if (!peer.isLink || peer.action !== "navigate" || !peer.href || !isInformationTopicLabel(peer.label) || !academicConcept.test(peer.label) || !academicGuideEnd.test(peer.label) || dangerous2.test(peer.label)) return false;
      try {
        const destination4 = new URL(peer.href);
        const peerParts = pathParts(destination4);
        return /^https?:$/.test(destination4.protocol) && destination4.origin === location.origin && !isDangerousURL(destination4, peerParts) && !hasDocumentReference(destination4) && !peerParts.some((part) => /^(?:news|articles?|stories|story|press)$/.test(part)) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(endpoint(peerParts)));
      } catch {
        return false;
      }
    };
    const educationPeers = evidence4.collectionPeers.filter(academicPeer);
    if (candidate.action === "navigate" && academicPeer({ label: candidate.label, action: candidate.action, href: candidate.href, isLink: element.matches("a[href]") }) && educationPeers.length >= 2 && educationPeers.length > evidence4.collectionPeers.length / 2) {
      return candidate.pagePurpose === "help" ? result("help", 70, "\uBA85\uC2DC\uC801 \uB3C4\uC6C0\uB9D0 \uBAA9\uC801\uACFC \uC6D0\uBCF8 \uAD50\uC721 \uAC1C\uB150 \uBAA9\uB85D", "reading") : result("academic", 70, "\uAC19\uC740 \uCD9C\uCC98 \uC77D\uAE30 \uB9C1\uD06C\uC640 \uB2E4\uC218\uC758 \uACE0\uC815 \uAD50\uC721 \uAC1C\uB150", "reading");
    }
    const readingTopic = evidence4.topicPeers >= 2 && (evidence4.controlledTopic || evidence4.associatedHeadings.length > 0) && !(destination3 && hasDocumentReference(destination3));
    const competingTask = rules.some((rule) => rule.category !== "help" && rule.label.test(label) && !(rule.category === "search" && searchGuidanceLabel.test(label)));
    const readingSubject = evidence4.linkedTopic || /(?:결과|기능|조건|절차|방법|안내|단계|항목|구성|개요)$/.test(label);
    const academicTopic2 = !dangerous2.test(label) && readingTopic && academicConcept.test(label) && !explicitApplication.test(label) && readingContexts.some((text3) => text3.length <= 60 && /학사|학적|교육\s*과정|학위|이수|전공|교양|졸업/.test(text3)) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(target));
    if (academicTopic2 && candidate.pagePurpose !== "help") return result("academic", 70, "\uC6D0\uBCF8 \uAD50\uC721 \uAC1C\uB150\uACFC \uC5F0\uACB0\uB41C \uB0B4\uC6A9 \uC81C\uBAA9", "reading");
    if (!dangerous2.test(label) && readingTopic && isInformationTopicLabel(label) && !isSearchControl(element, candidate.label) && !element.closest('form, [role~="form" i]') && !isDocumentDownload(element, candidate.label) && (!competingTask || readingSubject) && !rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target)) && guideReading) {
      return result("help", 70, "\uC6D0\uBCF8 \uC548\uB0B4 \uC8FC\uC81C\uC640 \uC5F0\uACB0\uB41C \uC77D\uAE30 \uC81C\uC5B4", "reading");
    }
    if (academicTopic2) {
      return result("academic", 70, "\uC6D0\uBCF8 \uAD50\uC721 \uAC1C\uB150\uACFC \uC5F0\uACB0\uB41C \uB0B4\uC6A9 \uC81C\uBAA9", "reading");
    }
    if (!dangerous2.test(label) && guideReading && candidate.action === "locate" && label.length <= 60 && element.matches('button, [role~="button" i]') && !element.closest('form, [role~="form" i]') && /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|받기|download)$/i.test(label)) {
      return result("help", 70, "\uC548\uB0B4 \uBB38\uB9E5\uC758 \uBA85\uC2DC\uC801 \uAC00\uC774\uB4DC \uC790\uB8CC \uC81C\uC5B4", "reading");
    }
    if (!dangerous2.test(label) && isInformationTopicLabel(label) && candidate.action === "locate" && (evidence4.informationPanels || guideContext && evidence4.grouped) && !rules.some((rule) => rule.category !== "help" && rule.label.test(label) && !(rule.category === "search" && searchGuidanceLabel.test(label))) && !isDocumentDownload(element, candidate.label) && !rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target))) return result("help", 65, "\uACF5\uAC1C \uC815\uBCF4 \uD328\uB110\xB7\uC548\uB0B4 \uC8FC\uC81C \uC77D\uAE30", "reading");
    const title = evidence4.title;
    if (!title || dangerous2.test(title.replace(/납부(?=\s*(?:내역|기록))/, "")) || isDocumentDownload(element, candidate.label) || destination3 && hasDocumentReference(destination3) || element.closest('form, [role~="form" i]')) return;
    if (/^(?=.{2,36}$).*(?:모의\s*계산|간단\s*계산|simulation|calculator)$/i.test(title) && !dangerous2.test(label) && !rules.some((rule) => rule.category !== "search" && rule.endpoints.has(target))) return result("search", 70, "\uBA85\uC2DC\uC801 \uBAA8\uC758\xB7\uAC04\uB2E8 \uACC4\uC0B0 \uCE74\uB4DC", "control");
    if (/^(?=.{2,36}$).*(?:내역|기록)\s*(?:조회|확인)(?:하기)?$/.test(title) && !dangerous2.test(label.replace(/납부(?=\s*(?:내역|기록))/g, "")) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return result("apply", 70, "\uAC1C\uC778 \uB0B4\uC5ED\xB7\uAE30\uB85D \uD655\uC778 \uCE74\uB4DC", "control");
    if (!dangerous2.test(label) && (applicationControlLabel.test(title) || explicitApplication.test(title) || /^(?=.{2,36}$).*(?:급여|급부|지원금)\s*청구$/.test(title)) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return result("apply", 70, "\uBA85\uC2DC\uC801 \uC2E0\uCCAD\xB7\uCCAD\uAD6C \uCE74\uB4DC \uC81C\uBAA9", "control");
  }
  function readonlyHelpDocument(candidate, label, target, url) {
    if (!url || candidate.context !== "body" || candidate.action !== "navigate" || !candidate.element.matches("a[href]") || !candidate.element.closest('li, tr, [role~="listitem"], [role~="row"]') || candidate.element.closest('article, [role~="article"]') || !hasDocumentReference(url) || candidate.pagePurpose !== "help" || label.length < 4 || label.length > 100 || pathParts(url).some((part) => /^(?:news|articles?|stories|story|press)$/.test(part)) || !(/(?:안내|방법|절차)$/.test(label) || interrogative.test(label)) || rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target))) return;
    return { ...candidate, category: "help", score: 72, reasons: ["\uB3C4\uC6C0\uB9D0 \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uB3C4\uC6C0\uB9D0 \uBAA9\uC801\uACFC \uBAA9\uB85D\uC758 \uBA85\uC2DC\uC801 \uC77D\uAE30 \uBB38\uC11C"], pageTask: "reading" };
  }
  function classify(candidates, options = {}) {
    const mode = options.mode ?? "institution";
    const collectionCache = /* @__PURE__ */ new WeakMap();
    const supplementalCache = /* @__PURE__ */ new WeakMap();
    const contentCache = /* @__PURE__ */ new WeakMap();
    const institutionCache = /* @__PURE__ */ new WeakMap();
    const navigationCache = createNavigationCache();
    const relationCache = createRelationCache();
    const classified = candidates.flatMap((candidate) => {
      const sourceLabel = normalize5(candidate.label).replace(/[_-]+/g, " ");
      const documentDownload = candidate.action === "locate" && isDocumentDownload(candidate.element, candidate.label);
      const label = documentDownload ? sourceLabel.replace(documentExtension, "").trim() : sourceLabel;
      const utility2 = navigationUtility(candidate.element, candidate.label, navigationCache);
      if (utility2 === "position") return [];
      if (orderingLabel.test(label)) return [];
      if (pageToolLabel.test(label.replace(/^\S+\s+(?=(?:전자\s*)?점자)/, ""))) return [];
      if (hasDangerousScript(candidate.element)) return [];
      let url;
      if (candidate.href) {
        try {
          url = new URL(candidate.href);
        } catch {
          return [];
        }
        if (!/^https?:$/.test(url.protocol)) return [];
      }
      const parts = url ? pathParts(url) : [];
      if (url && isDangerousURL(url, parts)) return [];
      let inspectionURL = url;
      if (!url) {
        const raw = candidate.element.getAttribute("href")?.trim() ?? "";
        if (raw && !/^(?:#|javascript:)/i.test(raw)) {
          try {
            const sourceURL2 = new URL(raw, document.baseURI);
            if (/^https?:$/.test(sourceURL2.protocol)) {
              if (isDangerousURL(sourceURL2, pathParts(sourceURL2))) return [];
              inspectionURL = sourceURL2;
            }
          } catch {
          }
        }
      }
      const target = endpoint(parts);
      const academicInfo = academicInformation(candidate, label, target, url);
      const element = candidate.element;
      if (mode === "institution" && candidate.context !== "footer" && isVisible(element) && element.matches('a[href], button, [role~="button" i], [role~="tab" i]') && !element.closest('form, [role~="form" i], input, textarea, select, [contenteditable]:not([contenteditable="false" i]), [role~="textbox" i], [role~="searchbox" i], [role~="combobox" i], [role~="spinbutton" i], [role~="slider" i]') && !(element instanceof HTMLButtonElement && element.form)) {
        const inspectionParts = inspectionURL ? pathParts(inspectionURL) : [];
        const inspectionTarget = endpoint(inspectionParts);
        const notice = noticeDocumentEvidence(candidate, label, normalize5(candidate.sectionLabel ?? ""), inspectionTarget, inspectionURL);
        const supportedAnchor = !(element instanceof HTMLAnchorElement) || !!inspectionURL || (element.getAttribute("href") ?? "").trim().startsWith("#");
        const article = !!element.closest('article, [role~="article" i]') || isArticle(candidate, inspectionParts, inspectionURL);
        if (supportedAnchor && notice !== "conflict" && (!article || !!notice || corroboratedArticleService(candidate, label, inspectionTarget, inspectionParts, inspectionURL))) {
          const evidence4 = institutionEvidence(candidate, institutionCache);
          const conflict = evidence4 && rules.some((rule) => rule.category !== evidence4.category && rule.endpoints.has(inspectionTarget));
          const readonlyDeadline = evidence4?.readonlyPanel === true && evidence4.contentScope === "content" && evidence4.category === "help" && evidence4.pageTask === "reading" && candidate.action === "locate" && element instanceof HTMLAnchorElement && /^#[^\s]+$/.test(element.getAttribute("href")?.trim() ?? "") && /^(?=.{2,60}$).*(?:납부\s*(?:기한|기간|일정)|\bpayment\s+(?:deadline|period|schedule))$/i.test(label) && !dangerous2.test(label.replace(/납부|\bpayment\b/gi, ""));
          if (evidence4 && !conflict && (!dangerous2.test(label) || readonlyDeadline)) return [{
            ...candidate,
            category: evidence4.category,
            score: evidence4.score,
            pageTask: evidence4.pageTask,
            institutionEvidence: evidence4,
            reasons: ["\uC6D0\uBCF8 \uBA54\uB274\uC640 \uC548\uB0B4 \uB0B4\uC6A9\uC758 \uAD00\uACC4", "\uAE30\uAD00 \uD398\uC774\uC9C0\uC758 \uBA85\uC2DC\uC801 \uC77D\uAE30 \uBAA9\uC801"]
          }];
        }
      }
      if (!dangerous2.test(label) && candidate.context === "body" && isVisible(element) && element.matches('a[href],button,[role~="button" i],[role~="tab" i]') && !element.closest('form,[role~="form" i],article,[role~="article" i],input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]') && !(element instanceof HTMLButtonElement && element.form)) {
        const relationTarget = inspectionURL ? endpoint(pathParts(inspectionURL)) : target;
        const relation = relationEvidence(candidate, relationCache);
        if (relation && !rules.some((rule) => rule.category !== relation.category && rule.endpoints.has(relationTarget)) && !noticeDocumentEvidence(candidate, label, normalize5(candidate.sectionLabel ?? ""), relationTarget, inspectionURL)) {
          return [{
            ...candidate,
            relationEvidence: relation,
            category: relation.category,
            score: relation.score,
            pageTask: relation.pageTask,
            relatedLabel: relation.relatedLabel,
            reasons: ["\uACE0\uC815 \uC6D0\uBCF8 \uC81C\uC5B4\uC640 \uAC19\uC740 \uBCF8\uBB38\uC758 \uAD00\uACC4", "\uC2E4\uC81C \uBAA9\uB85D\xB7\uD45C\xB7\uC11C\uBE44\uC2A4 \uD56D\uBAA9\uC758 \uBA85\uC2DC\uC801 \uC5ED\uD560"]
          }];
        }
      }
      const readonlyHelp = readonlyHelpDocument(candidate, label, target, url);
      if (readonlyHelp) return [readonlyHelp];
      const supplemental = supplementalClassification(candidate, label, target, supplementalCache, url, navigationCache);
      if (supplemental) return [supplemental];
      if (dangerous2.test(label) && !academicInfo) return [];
      const searchControl = isSearchControl(candidate.element, label);
      const searchGuidance = !searchControl && searchGuidanceLabel.test(label);
      const inquiry = label.split(/[\s\p{P}\p{S}]+/u).some((word) => inquiryWord.test(word));
      const section = normalize5(candidate.sectionLabel ?? "");
      const knownEndpoint = rules.some((rule) => rule.endpoints.has(target));
      const documentEvidence = noticeDocumentEvidence(candidate, label, section, target, url);
      if (documentEvidence === "conflict") return [];
      if (documentEvidence) {
        return [{
          ...candidate,
          category: "notice",
          score: documentEvidence === "endpoint" ? 72 : 60,
          reasons: ["\uACF5\uC9C0 \uBB38\uC11C \uC77D\uAE30", documentEvidence === "endpoint" ? "\uACF5\uC9C0 \uACBD\uB85C\uC640 \uBB38\uC11C \uD45C\uC2DC" : "\uACF5\uC9C0 \uC81C\uBAA9\uACFC \uBAA9\uB85D \uD56D\uBAA9"],
          pageTask: "reading"
        }];
      }
      if (isArticle(candidate, parts, url) && !corroboratedArticleService(candidate, label, target, parts, url)) return [];
      if (academicInfo) return [{ ...candidate, category: "academic", score: 70, reasons: ["\uD559\uC0AC \uB0A9\uBD80 \uC815\uBCF4 \uC77D\uAE30", "\uD559\uC0AC \uC81C\uBAA9\uACFC \uC548\uB0B4 \uBAA9\uC801\uC758 \uC77C\uBC18 \uB9C1\uD06C"], pageTask: "reading" }];
      const form3 = formReading(candidate, label, inspectionURL ? endpoint(pathParts(inspectionURL)) : target, url);
      if (form3 === "conflict") return [];
      if (form3) return [{ ...candidate, category: "apply", score: 70, reasons: ["\uC2E0\uCCAD \uC900\uBE44 \uBB38\uC11C \uC77D\uAE30", form3 === "document" ? "\uC11C\uC2DD \uBAA9\uB85D\uACFC \uBA85\uC2DC\uC801 \uBB38\uC11C\uBA85" : "\uBC1C\uAE09\xB7\uC2E0\uCCAD \uC808\uCC28\uC758 \uBA85\uC2DC\uC801 \uC11C\uC2DD \uB2E4\uC6B4\uB85C\uB4DC"], pageTask: "reading" }];
      if (documentDownload && candidate.context !== "footer") {
        if (issuanceIntent.test(label)) return [{ ...candidate, category: "apply", score: 70, reasons: ["\uBC1C\uAE09 \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uBA85\uC2DC\uC801 \uB2E4\uC6B4\uB85C\uB4DC\uC640 \uBC1C\uAE09 \uBAA9\uC801"], pageTask: "reading" }];
        if (label.length <= 60 && (/(?:사용|이용)\s*안내$/.test(label) || legalDocument.test(label))) {
          return [{ ...candidate, category: "help", score: 70, reasons: ["\uC548\uB0B4\xB7\uBC95\uB839 \uBB38\uC11C \uC77D\uAE30", "\uBA85\uC2DC\uC801 \uBB38\uC11C \uB2E4\uC6B4\uB85C\uB4DC"], pageTask: "reading" }];
        }
      }
      const contextual = contextualReading(candidate, label);
      if (contextual && !rules.some((rule) => rule.category !== contextual.category && rule.endpoints.has(target))) {
        return [{ ...candidate, ...contextual }];
      }
      if (candidate.context !== "footer" && url && ebookLabel.test(label) && parts.some((part) => part.split(/[^\p{L}\p{N}]+/u).some((token) => /^(?:faq|help)$/.test(token)))) {
        return [{ ...candidate, category: "help", score: 72, reasons: ["\uB3C4\uC6C0\uB9D0 \uBB38\uC11C \uC77D\uAE30", "\uC804\uC790\uCC45 \uC81C\uC5B4\uC640 \uB3C4\uC6C0\uB9D0 \uACBD\uB85C"], pageTask: "reading" }];
      }
      let best;
      let bestIntent = 0;
      for (const rule of rules) {
        const textMatch = (rule.label.test(label) || rule.category === "help" && (inquiry || contactHelp.test(label) || locationAction.test(label) || locationGuide.test(label) || hoursHelp.test(label) || branchDirectory.test(label)) || rule.category === "apply" && issuanceIntent.test(label) || rule.category === "notice" && publicNoticeList.test(label)) && !(rule.category === "search" && searchGuidance);
        const semanticMatch = rule.category === "search" && searchControl;
        const urlMatch = !!url && rule.endpoints.has(target);
        const sectionLabel = ambiguousLabel.test(label) || label.length <= 24 && decoratedMoreLabel.test(label) && urlMatch;
        const sectionMatch = candidate.context !== "footer" && sectionLabel && rule.section.test(section) && (!knownEndpoint || urlMatch) && (urlMatch || label.length <= 14);
        const footerHelp = candidate.context === "footer" && rule.category === "help" && textMatch && rule.section.test(label) && candidate.action === "navigate" && !!url;
        const urlOnly = !textMatch && !semanticMatch && !sectionMatch;
        if (urlOnly && (!urlMatch || candidate.context !== "primary" || candidate.action !== "navigate" || label.length > 24)) continue;
        const score = (textMatch ? 60 : semanticMatch ? 62 : sectionMatch ? 48 : 45) + (semanticMatch && textMatch ? 12 : 0) + (urlMatch && !urlOnly ? 12 : 0) + (candidate.context === "primary" ? 15 : candidate.context === "footer" ? footerHelp ? -15 : -25 : 0) + (label.length <= 14 ? 10 : label.length > 36 ? -15 : 0);
        const intent = textMatch && rule.category === "help" ? 2 : textMatch && rule.category === "apply" && (explicitApplication.test(label) || issuanceIntent.test(label)) ? 1 : 0;
        const reasons = [
          ...textMatch ? ["\uACE0\uC815 \uBB38\uAD6C \uC77C\uCE58"] : [],
          ...semanticMatch ? ["\uBA85\uC2DC\uC801 \uAC80\uC0C9 \uC81C\uC5B4"] : [],
          ...sectionMatch ? ["\uC8FC\uBCC0\uC758 \uC9E7\uC740 \uAE30\uB2A5 \uC81C\uBAA9 \uC77C\uCE58"] : [],
          ...urlMatch ? ["\uC644\uC804\uD55C URL \uAE30\uB2A5 \uACBD\uB85C"] : [],
          ...footerHelp ? ["\uD558\uB2E8\uC758 \uBA85\uD655\uD55C \uB3C4\uC6C0\uB9D0 \uB9C1\uD06C"] : [],
          candidate.context === "primary" ? "\uC8FC\uC694 \uBA54\uB274 \uC601\uC5ED" : candidate.context === "footer" ? "\uD558\uB2E8 \uC601\uC5ED \uAC10\uC810" : "\uBCF8\uBB38 \uC601\uC5ED"
        ];
        if (!best || score > best.score || score === best.score && intent > bestIntent) {
          const pageTask = candidate.context === "body" ? semanticMatch || rule.category === "apply" && applicationPageControl(candidate, label, target, url) || rule.category === "help" && (viewerControl.test(label) || candidate.element.matches('a[href], button, [role~="button"]') && (contactHelp.test(label) || locationAction.test(label) || hoursHelp.test(label) || branchDirectory.test(label) || counselingControl.test(label))) ? "control" : sectionMatch || rule.category === "notice" && noticeCollection.test(label) ? "collection" : void 0 : void 0;
          best = { ...candidate, category: rule.category, score, reasons, pageTask };
          bestIntent = intent;
        }
      }
      if (!best) {
        const structured = structuredContext(candidate, label, collectionEvidence(candidate.element, collectionCache), url, navigationCache);
        if (structured) return [{
          ...structured,
          collectionDependent: true,
          snapshot: sourceSnapshot(candidate.element, candidate.label, collectionCache, true, false, void 0, navigationCache)
        }];
      }
      if ((!best || best.category === "academic") && (academicReading(candidate, label, target, url) || academicLocalDestination(candidate, label, target, url))) {
        return [{ ...candidate, category: "academic", score: 70, reasons: ["\uD559\uC0AC \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uD559\uC0AC \uC81C\uBAA9\uACFC \uBAA9\uB85D\uC758 \uAD50\uC721 \uAC1C\uB150\xB7\uC9C0\uCE68"], pageTask: "reading" }];
      }
      const guideContext = contextsFor(candidate, label).some((value) => value.length <= 60 && /안내$/.test(value));
      const formSubmit = candidate.element instanceof HTMLButtonElement && !!candidate.element.form && candidate.element.type === "submit";
      if (!best && !utility2 && guideContext && isInformationTopicLabel(label) && candidate.context !== "footer" && candidate.action === "locate" && !formSubmit && candidate.element.matches('button, [role~="button"]') && /^(?:true|false)$/i.test(candidate.element.getAttribute("aria-expanded") ?? "") && !candidate.element.closest('article, [role~="article"]')) {
        return [{ ...candidate, category: "help", score: 60, reasons: ["\uC548\uB0B4 \uC815\uBCF4 \uD328\uB110 \uC77D\uAE30", "\uC548\uB0B4 \uC81C\uBAA9\uACFC \uBA85\uC2DC\uC801 \uD3BC\uCE68 \uC81C\uC5B4"], pageTask: "control" }];
      }
      if (!best && url && candidate.action === "navigate" && candidate.element.matches("a[href]") && candidate.context !== "footer" && label.length >= 4 && label.length <= 36 && /안내(?:\s*바로\s*가기)?$/.test(label) && !knownEndpoint && !hasDocumentReference(url) && !/^\d+(?:\.[a-z]+)?$/i.test(parts.at(-1) ?? "") && !candidate.element.closest('article, [role~="article"]')) {
        return [{ ...candidate, category: "help", score: 60, reasons: ["\uACF5\uAC1C \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uC9E7\uC740 \uC548\uB0B4 \uBAA9\uC801\uC758 \uC77C\uBC18 \uB9C1\uD06C"], pageTask: void 0 }];
      }
      return best && best.score >= 55 ? [best] : [];
    });
    return classified.map((candidate) => {
      const evidence4 = contentEvidence(candidate, contentCache, supplementalCache);
      return evidence4 ? { ...candidate, contentEvidence: evidence4 } : candidate;
    });
  }

  // src/page-session.ts
  function isCandidateCurrent(candidate, collectionCache, supplementalCache, contextCache, commonPurpose, contentCache, institutionCache, navigationCache, relationCache) {
    const label = candidateLabel(candidate.element);
    if (label !== candidate.label) return false;
    if (sourceContext(candidate.element) !== candidate.context) return false;
    const labels = contextLabels(candidate.element, contextCache);
    if (labels[0] !== candidate.sectionLabel || JSON.stringify(labels) !== JSON.stringify(candidate.contextLabels ?? [])) return false;
    if (pagePurpose(candidate.element, labels, commonPurpose) !== candidate.pagePurpose) return false;
    if (candidate.institutionEvidence) {
      const previous = candidate.institutionEvidence;
      const evidence4 = institutionEvidence(candidate, institutionCache);
      if (!evidence4 || evidence4.adapter !== previous.adapter || evidence4.version !== previous.version || evidence4.rule !== previous.rule || evidence4.category !== previous.category || evidence4.score !== previous.score || evidence4.pageTask !== previous.pageTask || evidence4.readonlyPanel !== previous.readonlyPanel || evidence4.contentScope !== previous.contentScope || evidence4.fingerprint !== previous.fingerprint || evidence4.dependencies.length !== previous.dependencies.length || evidence4.dependencies.some((node, index) => node !== previous.dependencies[index])) return false;
    }
    if (candidate.relationEvidence) {
      const previous = candidate.relationEvidence;
      const evidence4 = relationEvidence(candidate, relationCache);
      if (!evidence4 || evidence4.rule !== previous.rule || evidence4.category !== previous.category || evidence4.score !== previous.score || evidence4.pageTask !== previous.pageTask || evidence4.contentScope !== previous.contentScope || evidence4.relatedLabel !== previous.relatedLabel || evidence4.fingerprint !== previous.fingerprint || evidence4.dependencies.length !== previous.dependencies.length || evidence4.dependencies.some((node, index) => node !== previous.dependencies[index])) return false;
    }
    if (candidate.contentEvidence) {
      const previous = candidate.contentEvidence;
      const evidence4 = contentEvidence(candidate, contentCache, supplementalCache);
      if (!evidence4 || evidence4.level !== previous.level || evidence4.rule !== previous.rule || evidence4.taskGroup !== previous.taskGroup || evidence4.fingerprint !== previous.fingerprint || evidence4.dependencies.length !== previous.dependencies.length || evidence4.dependencies.some((node, index) => node !== previous.dependencies[index])) return false;
    }
    const current = sourceSnapshot(candidate.element, label, collectionCache, !!candidate.collectionDependent, !!candidate.supplementalDependent, supplementalCache, navigationCache);
    return !!candidate.snapshot && current.pageUrl === candidate.snapshot.pageUrl && current.baseUrl === candidate.snapshot.baseUrl && current.attributes === candidate.snapshot.attributes;
  }
  function areCandidatesCurrent(candidates) {
    const collectionCache = /* @__PURE__ */ new WeakMap();
    const supplementalCache = /* @__PURE__ */ new WeakMap();
    const contextCache = /* @__PURE__ */ new WeakMap();
    const contentCache = /* @__PURE__ */ new WeakMap();
    const institutionCache = /* @__PURE__ */ new WeakMap();
    const navigationCache = createNavigationCache();
    const relationCache = createRelationCache();
    const commonPurpose = documentPurpose() ?? null;
    return candidates.every((candidate) => isCandidateCurrent(candidate, collectionCache, supplementalCache, contextCache, commonPurpose, contentCache, institutionCache, navigationCache, relationCache));
  }
  function watchCandidates(getCandidates, onStale) {
    let stopped = false;
    let scheduled;
    const check = () => {
      if (!stopped && !areCandidatesCurrent(getCandidates())) onStale();
    };
    const observer = new MutationObserver((records) => {
      if (records.every((record) => record.target instanceof Element && !!record.target.closest("[data-easyweb-host]"))) return;
      if (scheduled === void 0) scheduled = window.setTimeout(() => {
        scheduled = void 0;
        check();
      }, 80);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href", "action", "method", "onsubmit", "rel", "target", "onclick", "aria-controls", "aria-current", "aria-selected", "aria-expanded", "aria-haspopup", "download", "type", "form", "id", "role", "tabindex", "disabled", "aria-disabled", "aria-hidden", "hidden", "class", "style", "aria-label", "aria-labelledby", "title", "placeholder", "contenteditable"]
    });
    const interval = window.setInterval(check, 300);
    window.addEventListener("popstate", check);
    window.addEventListener("hashchange", check);
    return () => {
      stopped = true;
      observer.disconnect();
      window.clearInterval(interval);
      if (scheduled !== void 0) window.clearTimeout(scheduled);
      window.removeEventListener("popstate", check);
      window.removeEventListener("hashchange", check);
    };
  }

  // src/styles.css
  var styles_default = ":host { all: initial; color-scheme: light; }\n* { box-sizing: border-box; }\ndialog { inset: 0; width: 100vw; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0; background: #f5f7fa; color: #172739; font: 18px/1.6 -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; overflow-y: auto; overscroll-behavior: contain; }\ndialog::backdrop { background: #f5f7fa; }\nbutton, a { font: inherit; -webkit-tap-highlight-color: transparent; }\nbutton { cursor: pointer; }\nbutton:focus-visible, a:focus-visible, summary:focus-visible { outline: 3px solid #08796e; outline-offset: 5px; }\nsvg { display: block; width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }\n.topbar { background: #fff; border-bottom: 1px solid #e4e9ee; }\n.top-inner { max-width: 1160px; margin: auto; padding: 22px 36px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }\n.brand { display: flex; align-items: center; gap: 12px; font-size: 23px; font-weight: 760; letter-spacing: -.7px; }\n.brand-mark { background: #0a7b70; color: white; border-radius: 12px; padding: 8px; }\n.brand-mark svg { width: 25px; height: 25px; }\n.brand small { display: block; font-size: 12px; line-height: 1.4; font-weight: 500; letter-spacing: 0; color: #697887; }\n.close { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 48px; padding: 10px 18px; background: #fff; color: #34465a; border: 1px solid #7f8c99; border-radius: 10px; font-size: 16px; font-weight: 650; }\n.close svg { width: 18px; height: 18px; }\n.close:hover { background: #f0f5f6; border-color: #3e8c81; }\n.shell { max-width: 1088px; margin: 0 auto; padding: 40px 36px 24px; }\n.site { display: flex; gap: 9px; align-items: center; color: #5c6b7b; font-size: 14px; flex-wrap: wrap; }\n.site .dot { width: 7px; height: 7px; border-radius: 50%; background: #0a7b70; }\n.site strong { color: #334b5d; font-weight: 600; overflow-wrap: anywhere; }\n.site-tag { color: #087367; font-size: 12px; background: #e0eee9; padding: 3px 9px; border-radius: 6px; margin-left: 4px; }\n.intro { margin: 29px 0 30px; }\nh1 { font-size: clamp(30px, 4vw, 42px); font-weight: 760; letter-spacing: -1.8px; line-height: 1.35; margin: 0 0 12px; }\n.intro p { color: #5e6e7e; margin: 0; font-size: 18px; word-break: keep-all; }\n.section-label { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; color: #4d6071; font-size: 14px; }\n.section-label h2 { font-size: 15px; font-weight: 650; margin: 0; }\n.section-heading { display: flex; align-items: baseline; gap: 12px; }\n.page-indicator { color: #3f5568; font-size: 15px; font-weight: 600; }\n.page-indicator[hidden] { display: none; }\n.section-actions { display: flex; flex-wrap: wrap; gap: 10px; }\n.refresh, .menu-shortcut { min-height: 52px; min-width: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 17px; font-weight: 650; }\n.refresh { background: #fff; color: #34465a; border: 1px solid #7f8c99; }\n.refresh:hover { background: #f0f5f6; border-color: #3e8c81; }\n.refresh svg { width: 18px; height: 18px; }\n.menu-shortcut { background: #e6f2ef; color: #064f47; border: 2px solid #08665c; }\n.common { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 18px; }\n.common[hidden] { display: none; }\n.common-label { font-size: 16px; font-weight: 650; color: #34465a; }\n.common-list { display: flex; flex-wrap: wrap; gap: 10px; }\n.common-action { min-height: 52px; min-width: 48px; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; background: #fff; color: #172b3a; border: 1px solid #7f8c99; font-size: 17px; font-weight: 650; text-decoration: none; cursor: pointer; }\n.common-action:hover { background: #f0f5f6; border-color: #3e8c81; }\n.common-action svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }\n.common-action[aria-disabled='true'] { color: #5f6b76; border-style: dashed; cursor: not-allowed; }\n.menu-shortcut:enabled:hover { background: #d3e9e3; }\n.menu-shortcut:disabled { background: #edf1f5; color: #526476; border-color: #7f8c99; cursor: not-allowed; }\n.menu-shortcut[hidden] { display: none; }\n.arrow { font-weight: 700; }\n.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }\n.menu-pages { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 20px; }\n.menu-page { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; min-width: 48px; max-width: 100%; padding: 10px 18px; border: 1px solid #7f8c99; border-radius: 10px; color: #34465a; background: #fff; font-size: 16px; font-weight: 650; overflow-wrap: anywhere; }\n.menu-page:enabled:hover { background: #f0f5f6; border-color: #3e8c81; }\n.menu-page:disabled { background: #edf1f5; color: #526476; cursor: not-allowed; }\n.menu-pages[hidden], .menu-page[hidden] { display: none; }\n.card { display: flex; flex-direction: column; align-items: start; min-height: 224px; padding: 24px; background: white; color: #172739; text-decoration: none; border: 1px solid #7f8c99; border-radius: 18px; text-align: left; transition: border-color .15s, box-shadow .15s; overflow-wrap: anywhere; }\n.card:hover { border-color: #3e8c81; box-shadow: 0 8px 24px #263d4d0b; }\n.card[aria-disabled='true'] { background: #edf1f5; border-color: #c2cbd4; cursor: not-allowed; }\n.change-notice { padding: 15px 18px; background: #fff0d8; color: #704709; border: 1px solid #e6cc9f; border-radius: 10px; font-size: 16px; }\n.change-notice[hidden] { display: none; }\n.card-icon { width: 52px; height: 52px; display: grid; place-items: center; background: #eaf1ff; color: #4263ad; border-radius: 14px; margin-bottom: 18px; }\n.card[data-category='search'] .card-icon, .card[data-category='apply'] .card-icon { background: #e1f1ed; color: #168273; }\n.card[data-category='notice'] .card-icon, .card[data-category='help'] .card-icon { background: #fff1dc; color: #a57019; }\n.card-title { font-size: 24px; font-weight: 730; letter-spacing: -.7px; line-height: 1.3; }\n.card-description { font-size: 15px; color: #647486; margin-top: 7px; }\n.card-source { font-size: 13px; color: #627482; margin-top: 12px; max-width: 100%; }\n.card-action { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #08796e; margin-top: auto; padding-top: 17px; }\n.card-action svg { width: 15px; height: 15px; }\n.empty { grid-column: 1 / -1; text-align: center; background: white; padding: 42px 24px; border: 1px solid #dce3ea; border-radius: 18px; }\n.empty h3 { margin: 10px 0; font-size: 24px; }\n.empty p { color: #607181; margin: 0 0 24px; }\n.hint { display: flex; align-items: flex-start; gap: 12px; margin-top: 26px; padding: 18px 21px; background: #eaf0f4; border: 1px solid #e0e7ed; border-radius: 12px; color: #53677a; font-size: 14px; }\n.hint svg { width: 20px; height: 20px; margin-top: 2px; }\n.hint p { margin: 0; }\n.hint strong { color: #344f65; }\n.bottom { display: flex; justify-content: space-between; gap: 20px; padding: 24px 2px 8px; color: #526476; font-size: 13px; }\n.status { min-height: 24px; }\n@media (forced-colors: active) {\n  .card, .close, .refresh, .menu-page, .menu-shortcut, .common-action { border: 1px solid ButtonText; background: ButtonFace; color: ButtonText; }\n  .card[aria-disabled='true'], .common-action[aria-disabled='true'] { border-color: GrayText; color: GrayText; }\n  .menu-page:disabled, .menu-shortcut:disabled { border-color: GrayText; color: GrayText; }\n  button:focus-visible, a:focus-visible { outline: 3px solid Highlight; }\n  .card-icon { border: 1px solid CanvasText; }\n}\n@media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }\n@media (max-width: 800px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .shell { padding-top: 28px; } }\n@media (max-width: 520px) {\n  .top-inner { padding: 16px 20px; gap: 10px; } .brand { font-size: 20px; gap: 9px; } .brand small { display: none; }\n  .close { padding: 9px 12px; font-size: 14px; } .shell { padding: 26px 20px 20px; }\n  .intro { margin: 24px 0; } .intro p { font-size: 16px; } h1 { letter-spacing: -1px; }\n  .grid { grid-template-columns: 1fr; gap: 12px; } .card { min-height: 190px; padding: 22px; }\n  .bottom { flex-direction: column; gap: 6px; } .site-tag { margin-left: 0; }\n}\n";

  // src/ranker.ts
  var MAX_CARDS = 6;
  var MAX_PER_CATEGORY = 3;
  var MAX_PAGE_TASKS = 3;
  var incidentalLabel = /^(?:개인\s*정보\s*처리\s*방침|웹\s*접근성\s*(?:안내|정책)?|법령\s*정보|이용\s*약관|저작권\s*(?:정책|보호\s*정책)?|이메일\s*(?:주소\s*)?무단\s*수집\s*거부|영상\s*정보\s*처리\s*기기\s*운영\s*(?:관리\s*)?방침)$/;
  var contextOrder = { primary: 0, body: 1, footer: 2 };
  var compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var normalizedLabel = (candidate) => candidate.label.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  var contentPriority = (candidate) => candidate.contentEvidence?.level ?? 0;
  function destination(candidate) {
    if (candidate.action !== "navigate" || !candidate.href) return "";
    try {
      return new URL(candidate.href).href;
    } catch {
      return candidate.href;
    }
  }
  function isPageTask(candidate) {
    return !!candidate.pageTask && candidate.context !== "footer" && !candidate.element.closest('header, [role~="banner"]');
  }
  function isLocalNavigation(candidate) {
    return candidate.context === "primary" && !!candidate.element.closest('nav, [role~="navigation"]') && !candidate.element.closest('header, [role~="banner"]');
  }
  function navigationPriority(candidate) {
    if (!isLocalNavigation(candidate) || isPageTask(candidate)) return 0;
    const current = candidate.element.getAttribute("aria-current");
    if (current && current.toLowerCase() !== "false") return 0;
    if (candidate.href) {
      try {
        const url = new URL(candidate.href);
        if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return 0;
      } catch {
      }
    }
    const item = candidate.element.closest('li, [role~="listitem"]');
    const submenu = item?.querySelector(':scope > ul, :scope > ol, :scope > [role~="group"], :scope > [role~="menu"]');
    return submenu || candidate.element.hasAttribute("aria-expanded") ? 1 : 2;
  }
  function pagePriority(candidate) {
    if (candidate.context === "footer") return -1;
    if (isPageTask(candidate)) {
      const purposeMatch = candidate.pagePurpose === "academic-calendar" && candidate.category === "academic" || candidate.pagePurpose === "help" && candidate.category === "help";
      return purposeMatch ? 3 : 2;
    }
    return isLocalNavigation(candidate) ? 1 : 0;
  }
  function sameOriginURL(candidate) {
    if (candidate.action !== "navigate" || !candidate.href) return;
    try {
      const url = new URL(candidate.href);
      return url.origin === location.origin ? url : void 0;
    } catch {
      return;
    }
  }
  function representedDocuments(candidates) {
    const lists2 = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      const url = sameOriginURL(candidate);
      if (url && !hasDocumentReference(url) && url.pathname !== location.pathname) lists2.add(url.pathname);
    }
    return new Set(candidates.filter((candidate) => {
      const url = sameOriginURL(candidate);
      return !!url && candidate.pageTask === "reading" && hasDocumentReference(url) && lists2.has(url.pathname);
    }));
  }
  var searchField = 'input:not([type]), input[type="text" i], input[type="search" i], [role~="searchbox" i]';
  var searchButton = 'button, input[type="submit" i], input[type="button" i], input[type="image" i]';
  function searchGroup(candidate) {
    const element = candidate.element;
    const isField = element.matches(searchField), isButton = element.matches(searchButton);
    if (!isField && !isButton) return;
    const owner = element instanceof HTMLInputElement || element instanceof HTMLButtonElement ? element.form : null;
    if (owner) return owner;
    let container = element.parentElement;
    for (let depth = 0; container && depth < 3; depth++, container = container.parentElement) {
      if (container.querySelector(isField ? searchButton : searchField)) return container;
    }
  }
  function firstScreenRepeats(ordered2) {
    const here = location.origin + location.pathname + location.search;
    const names = /* @__PURE__ */ new Set(), searches = /* @__PURE__ */ new Set(), repeats = /* @__PURE__ */ new Set();
    for (const candidate of ordered2) {
      const url = sameOriginURL(candidate);
      const name2 = candidate.action === "navigate" ? `${candidate.category}:${normalizedLabel(candidate)}:${candidate.relatedLabel ?? ""}:${candidate.sectionLabel ?? ""}` : void 0;
      const group = candidate.category === "search" ? searchGroup(candidate) : void 0;
      if (url && url.origin + url.pathname + url.search === here || name2 && names.has(name2) || group && searches.has(group)) {
        repeats.add(candidate);
        continue;
      }
      if (name2) names.add(name2);
      if (group) searches.add(group);
    }
    return repeats;
  }
  function sourceOrder(a, b) {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
  }
  function compare(a, b) {
    return contentPriority(b) - contentPriority(a) || pagePriority(b) - pagePriority(a) || navigationPriority(b) - navigationPriority(a) || b.score - a.score || contextOrder[a.context] - contextOrder[b.context] || a.label.length - b.label.length || compareText(normalizedLabel(a), normalizedLabel(b)) || compareText(destination(a), destination(b)) || compareText(a.category ?? "", b.category ?? "") || compareText(a.action, b.action) || compareText(a.element.id, b.element.id);
  }
  function ordered(candidates) {
    const sorted = [...candidates].sort(compare);
    const groups = /* @__PURE__ */ new Map();
    const filterGroups = /* @__PURE__ */ new Map();
    const supplementalCache = /* @__PURE__ */ new WeakMap();
    sorted.forEach((candidate, index) => {
      if (candidate.pageTask === "reading") {
        const container = candidate.element.closest('ul, ol, table, [role~="list"], [role~="grid"]');
        if (!container) return;
        const key = `${candidate.category}:${contentPriority(candidate)}:${pagePriority(candidate)}:${navigationPriority(candidate)}:${candidate.score}:${candidate.context}:${candidate.pagePurpose ?? ""}`;
        const peers = groups.get(container) ?? /* @__PURE__ */ new Map();
        peers.set(key, [...peers.get(key) ?? [], index]);
        groups.set(container, peers);
      } else if (candidate.category === "search" && candidate.pageTask === "control" && candidate.supplementalDependent) {
        const element = candidate.element;
        const container = element.closest('ul, ol, [role~="list" i]');
        const form3 = element.closest('form, [role~="form" i]') ?? (element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.form : null);
        if (!container || !form3 || !supplementalEvidence(element, supplementalCache).filter) return;
        const key = `${candidate.category}:${contentPriority(candidate)}:${pagePriority(candidate)}:${navigationPriority(candidate)}:${candidate.score}:${candidate.context}:${candidate.pagePurpose ?? ""}`;
        const lists2 = filterGroups.get(form3) ?? /* @__PURE__ */ new Map();
        const peers = lists2.get(container) ?? /* @__PURE__ */ new Map();
        const positions = peers.get(key) ?? [];
        positions.push(index);
        peers.set(key, positions);
        lists2.set(container, peers);
        filterGroups.set(form3, lists2);
      }
    });
    const applySourceOrder = (peers) => {
      for (const positions of peers.values()) {
        const controls3 = positions.map((index) => sorted[index]).sort(sourceOrder);
        positions.forEach((index, offset) => {
          sorted[index] = controls3[offset];
        });
      }
    };
    for (const peers of groups.values()) applySourceOrder(peers);
    for (const lists2 of filterGroups.values()) for (const peers of lists2.values()) applySourceOrder(peers);
    return sorted;
  }
  function rank(candidates) {
    const destinations = /* @__PURE__ */ new Set();
    const controls3 = /* @__PURE__ */ new Set();
    const categorized = candidates.filter((candidate) => candidate.category);
    const represented = representedDocuments(categorized);
    const distinct = ordered(categorized.filter((candidate) => !represented.has(candidate))).filter((candidate) => {
      const href = destination(candidate);
      if (href) {
        if (destinations.has(href)) return false;
        destinations.add(href);
      } else {
        if (controls3.has(candidate.element)) return false;
        controls3.add(candidate.element);
      }
      return true;
    });
    const repeats = firstScreenRepeats(distinct);
    const kept = distinct.filter((candidate) => !repeats.has(candidate));
    const incidental = kept.filter((candidate) => incidentalLabel.test(normalizedLabel(candidate).normalize("NFKC")));
    const unique = kept.filter((candidate) => !incidental.includes(candidate));
    const counts = /* @__PURE__ */ new Map();
    const selected4 = [];
    for (const level of [2, 1]) {
      const content = unique.filter((candidate) => contentPriority(candidate) === level);
      const categories = /* @__PURE__ */ new Set();
      const add = (candidate) => {
        selected4.push(candidate);
        counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
      };
      for (const candidate of content) {
        if (categories.has(candidate.category)) continue;
        categories.add(candidate.category);
        add(candidate);
        if (selected4.length === MAX_CARDS) return ordered(selected4);
      }
      for (const candidate of content) {
        if (selected4.includes(candidate) || candidate.contentEvidence?.taskGroup && selected4.some((item) => item.contentEvidence?.taskGroup === candidate.contentEvidence?.taskGroup)) continue;
        add(candidate);
        if (selected4.length === MAX_CARDS) return ordered(selected4);
      }
    }
    for (const candidate of unique) {
      if (selected4.length >= MAX_PAGE_TASKS) break;
      if (!candidate.category || selected4.includes(candidate) || !isPageTask(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
      counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
      selected4.push(candidate);
      if (selected4.length === MAX_PAGE_TASKS) break;
    }
    for (const candidate of unique) {
      if (!candidate.category || counts.has(candidate.category)) continue;
      counts.set(candidate.category, 1);
      selected4.push(candidate);
      if (selected4.length === MAX_CARDS) return ordered(selected4);
    }
    for (const candidate of unique) {
      if (!candidate.category || selected4.includes(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
      counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
      selected4.push(candidate);
      if (selected4.length === MAX_CARDS) break;
    }
    if (selected4.length < MAX_CARDS) for (const candidate of [...unique, ...incidental]) {
      if (selected4.includes(candidate)) continue;
      selected4.push(candidate);
      if (selected4.length === MAX_CARDS) break;
    }
    return ordered(selected4);
  }
  function alreadyShown(selected4) {
    const destinations = /* @__PURE__ */ new Set();
    const controls3 = /* @__PURE__ */ new Set();
    for (const candidate of selected4) {
      const href = destination(candidate);
      if (href) destinations.add(href);
      else controls3.add(candidate.element);
    }
    return { destinations, controls: controls3 };
  }
  function hasMoreMenus(candidates, selected4) {
    const shown = alreadyShown(selected4);
    return candidates.some((candidate) => {
      if (!candidate.category) return false;
      const href = destination(candidate);
      return href ? !shown.destinations.has(href) : !shown.controls.has(candidate.element);
    });
  }
  function* remainingMenus(candidates, selected4) {
    const shown = alreadyShown(selected4);
    for (const candidate of ordered(candidates.filter((candidate2) => candidate2.category))) {
      const href = destination(candidate);
      if (href) {
        if (shown.destinations.has(href)) continue;
        shown.destinations.add(href);
      } else {
        if (shown.controls.has(candidate.element)) continue;
        shown.controls.add(candidate.element);
      }
      yield candidate;
    }
  }

  // src/action-bridge.ts
  function exposedInViewport(element) {
    let intersects = false;
    for (const rect of element.getClientRects()) {
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      if (right <= left || bottom <= top) continue;
      intersects = true;
      const points = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]];
      for (const [x, y] of points) {
        const hit = document.elementFromPoint(left + (right - left) * x, top + (bottom - top) * y);
        if (hit && (hit === element || element.contains(hit))) return null;
      }
    }
    return intersects ? "covered" : "outside-viewport";
  }
  function locateOriginal(candidate, close) {
    close();
    if (!isVisible(candidate.element)) return { ok: false, reason: "unavailable" };
    const element = candidate.element;
    element.dispatchEvent(new Event("easyweb:clear-highlight"));
    element.scrollIntoView({ block: "center", behavior: "instant" });
    if (!isVisible(element)) return { ok: false, reason: "unavailable" };
    const exposure = exposedInViewport(element);
    if (exposure) return { ok: false, reason: exposure };
    const previousTabindex = element.getAttribute("tabindex");
    const changedTabindex = element.tabIndex < 0 || element.matches("a:not([href]):not([tabindex])");
    if (changedTabindex) element.tabIndex = -1;
    const restoreTabindex = () => {
      if (changedTabindex && element.getAttribute("tabindex") === "-1") {
        if (previousTabindex === null) element.removeAttribute("tabindex");
        else element.setAttribute("tabindex", previousTabindex);
      }
    };
    element.focus({ preventScroll: true });
    const afterFocus = !isVisible(element) ? "unavailable" : candidate.snapshot && !isCandidateCurrent(candidate) ? "changed" : exposedInViewport(element) ?? (document.activeElement === element || !!document.activeElement && element.contains(document.activeElement) ? null : "focus-failed");
    if (afterFocus) {
      restoreTabindex();
      return { ok: false, reason: afterFocus };
    }
    const hadStyle = element.getAttribute("style") !== null;
    const outline = element.style.getPropertyValue("outline");
    const priority = element.style.getPropertyPriority("outline");
    const offset = element.style.getPropertyValue("outline-offset");
    const offsetPriority = element.style.getPropertyPriority("outline-offset");
    element.style.setProperty("outline", "4px solid #087e76", "important");
    element.style.setProperty("outline-offset", "5px", "important");
    const appliedOutline = element.style.getPropertyValue("outline");
    let timer;
    const restore = () => {
      if (timer !== void 0) window.clearTimeout(timer);
      if (element.style.getPropertyValue("outline") === appliedOutline && element.style.getPropertyPriority("outline") === "important") {
        if (outline) element.style.setProperty("outline", outline, priority);
        else element.style.removeProperty("outline");
      }
      if (element.style.getPropertyValue("outline-offset") === "5px" && element.style.getPropertyPriority("outline-offset") === "important") {
        if (offset) element.style.setProperty("outline-offset", offset, offsetPriority);
        else element.style.removeProperty("outline-offset");
      }
      restoreTabindex();
      if (!hadStyle && element.getAttribute("style") === "") element.removeAttribute("style");
      element.removeEventListener("easyweb:clear-highlight", restore);
    };
    element.addEventListener("easyweb:clear-highlight", restore, { once: true });
    timer = window.setTimeout(restore, 3500);
    return { ok: true };
  }

  // src/original-notice.ts
  function clearOriginalNotice() {
    document.querySelector("[data-easyweb-notice]")?.dispatchEvent(new Event("easyweb:dismiss-notice"));
  }
  function showOriginalNotice(result, label, source) {
    clearOriginalNotice();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = document.createElement("div");
    host.dataset.easywebNotice = "true";
    host.dataset.easywebNoticeReason = result.ok ? "ready" : result.reason;
    const shadow = host.attachShadow({ mode: "open" });
    const panel = document.createElement("div");
    panel.setAttribute("role", result.ok ? "status" : "alert");
    const text3 = document.createElement("p");
    text3.id = "easyweb-original-message";
    text3.textContent = result.ok ? `\uC6D0\uBCF8\uC758 \u2018${label}\u2019 \uBA54\uB274\uB97C \uD45C\uC2DC\uD588\uC5B4\uC694. \uC9C1\uC811 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.` : result.reason === "changed" ? "\uC6D0\uBCF8 \uBA54\uB274\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694. EasyWeb\uC744 \uB2E4\uC2DC \uC5F4\uC5B4 \uCC3E\uC544\uC8FC\uC138\uC694." : result.reason === "covered" ? "\uC6D0\uBCF8 \uBA54\uB274\uAC00 \uB2E4\uB978 \uCC3D\uC5D0 \uAC00\uB824\uC838 \uC788\uC5B4\uC694. \uC0AC\uC774\uD2B8\uC758 \uD31D\uC5C5\uC744 \uB2EB\uACE0 \uB2E4\uC2DC \uCC3E\uC544\uC8FC\uC138\uC694." : result.reason === "unavailable" ? "\uC6D0\uBCF8 \uBA54\uB274\uAC00 \uBC14\uB00C\uC5C8\uAC70\uB098 \uC0AC\uB77C\uC84C\uC5B4\uC694. \uB2E4\uC2DC EasyWeb\uC744 \uC5F4\uC5B4 \uCC3E\uC544\uC8FC\uC138\uC694." : "\uC6D0\uBCF8 \uBA54\uB274\uB97C \uD654\uBA74\uC5D0\uC11C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC6D0\uBCF8 \uD654\uBA74\uC5D0\uC11C \uBA54\uB274\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "\uC548\uB0B4 \uB2EB\uAE30";
    dismiss.setAttribute("aria-describedby", text3.id);
    const style = document.createElement("style");
    const sourceInLowerHalf = source.isConnected && source.getBoundingClientRect().top > window.innerHeight / 2;
    style.textContent = `:host{all:initial}div{position:fixed;${sourceInLowerHalf ? "top" : "bottom"}:16px;right:16px;z-index:2147483647;box-sizing:border-box;width:min(480px,calc(100vw - 32px));max-height:40vh;overflow:auto;padding:16px;background:#fff;color:#172739;border:2px solid #08796e;border-radius:12px;box-shadow:0 4px 20px #17273925;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif}p{margin:0 0 8px;overflow-wrap:anywhere}button{min-height:48px;min-width:48px;padding:8px 16px;background:#fff;color:#172739;border:1px solid #526476;border-radius:8px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #08796e;outline-offset:3px}@media(forced-colors:active){div,button{background:Canvas;color:CanvasText;border-color:CanvasText}button:focus-visible{outline-color:Highlight}}`;
    panel.append(text3, dismiss);
    shadow.append(style, panel);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      const restoreFocus = !!shadow.activeElement;
      observer.disconnect();
      document.removeEventListener("keydown", onKey);
      dismiss.removeEventListener("click", close);
      host.removeEventListener("easyweb:dismiss-notice", close);
      host.remove();
      if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    const observer = new MutationObserver(() => {
      if (!host.isConnected) close();
    });
    dismiss.addEventListener("click", close);
    host.addEventListener("easyweb:dismiss-notice", close, { once: true });
    document.addEventListener("keydown", onKey);
    observer.observe(document, { childList: true, subtree: true });
    document.body.append(host);
    if (!result.ok) dismiss.focus({ preventScroll: true });
  }

  // src/common-actions.ts
  var COMMON_TITLES = { home: "\uCC98\uC74C \uD654\uBA74", login: "\uB85C\uADF8\uC778", signup: "\uD68C\uC6D0\uAC00\uC785", phone: "\uC804\uD654 \uBB38\uC758" };
  var homeLeaf = /^(?:index|main|home)(?:\.[a-z]+)?$/i;
  var language = "(?:kor?|kr|eng?|jpn?|ja|chn?|zh)";
  var languageRoot = new RegExp(`^(?:${language}|[a-z0-9]+[-_]${language})(?:\\.[a-z]+)?$`, "i");
  var homeLabel = /^(?:처음\s*(?:으로|화면(?:으로)?)?|첫\s*화면(?:으로)?|홈(?:\s*(?:으로|화면|페이지))?|home(?:\s*page)?|메인(?:\s*(?:으로|화면|페이지))?|main(?:\s*page)?)$/i;
  var loginLabel = /^(?:(?:통합\s*)?로그인(?:\s*하기)?|log\s*-?\s*in|sign\s*-?\s*in)$/i;
  var signupLabel = /^(?:회원\s*가입(?:\s*하기)?|sign\s*-?\s*up|join(?:\s*us)?)$/i;
  var phoneContext = /대표|콜\s*센터|고객\s*센터|상담|민원|문의|안내/;
  var phoneDigits = (candidate) => (candidate.element.getAttribute("href") ?? "").replace(/^tel:/i, "").replace(/[^\d-]/g, "");
  var text = (candidate) => candidate.label.normalize("NFKC").replace(/\s+/g, " ").trim();
  function isHomePath(url) {
    if (url.search) return false;
    const parts = url.pathname.split("/").filter(Boolean);
    const popped = parts.length && homeLeaf.test(parts.at(-1));
    while (parts.length && homeLeaf.test(parts.at(-1))) parts.pop();
    const sitePrefix = popped && parts.length === 1 && url.hostname.toLowerCase().split(".").includes(parts[0].toLowerCase());
    return parts.length === 0 || sitePrefix || parts.length === 1 && languageRoot.test(parts[0]);
  }
  function isHomePage() {
    return isHomePath(location);
  }
  function sameOriginURL2(candidate) {
    try {
      const url = new URL(candidate.href);
      return url.origin === location.origin ? url : void 0;
    } catch {
      return;
    }
  }
  function isHomeLink(candidate) {
    if (!isSafeNavigation(candidate)) return false;
    const url = sameOriginURL2(candidate);
    if (!url || !isHomePath(url) || url.pathname === location.pathname && url.search === location.search) return false;
    return homeLabel.test(text(candidate)) || !!candidate.element.closest('header, [role~="banner"]');
  }
  function first(candidates, test) {
    const matches = candidates.filter(test);
    return matches.find((candidate) => candidate.context !== "footer") ?? matches[0];
  }
  function commonActions(raw, classified, home = isHomePage()) {
    const found = [];
    const add = (kind, candidate) => {
      if (candidate) found.push({ kind, candidate });
    };
    if (!home) {
      add("home", first(raw, isHomeLink));
      add("login", first(classified, (candidate) => candidate.category === "login" && loginLabel.test(text(candidate))));
    }
    add("signup", first(raw, (candidate) => signupLabel.test(text(candidate)) && isSafeNavigation(candidate)));
    const phones = raw.filter((candidate) => candidate.element.matches('a[href^="tel:" i]') && phoneDigits(candidate).replace(/-/g, "").length >= 3);
    add("phone", phones.find((candidate) => phoneContext.test(text(candidate)) || phoneContext.test(candidate.element.parentElement?.textContent ?? "")) ?? phones.find((candidate) => candidate.context === "footer") ?? phones[0]);
    return found;
  }
  function phoneNumber(candidate) {
    return phoneDigits(candidate);
  }
  function withoutCommon(classified, common) {
    const elements = new Set(common.map((item) => item.candidate.element));
    const destinations = new Set(common.flatMap((item) => item.candidate.action === "navigate" && item.candidate.href ? [item.candidate.href] : []));
    const login = common.some((item) => item.kind === "login");
    return classified.filter((candidate) => !elements.has(candidate.element) && !(candidate.action === "navigate" && candidate.href && destinations.has(candidate.href)) && !(login && candidate.category === "login" && loginLabel.test(text(candidate))));
  }

  // src/page-types.ts
  var MAX_CARDS2 = 6;
  var POST_CARDS = 4;
  var outside = 'header, nav, footer, aside, [role~="banner" i], [role~="navigation" i], [role~="contentinfo" i], [role~="complementary" i]';
  var text2 = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  var attachmentLink = /^(?:첨부\s*파일|파일\s*첨부|첨부)(?:\s*(?:다운로드|내려\s*받기|보기))?(?:\s|$)/;
  var searchPeriod = /(?:시작|종료|마지막|끝)\s*일|기간|날짜|\bdate\b/i;
  var titleBadges = /(?:\s*(?:새\s*글|new|n|첨부\s*파일(?:\s*있음)?|파일\s*첨부|hot|조회\s*수?\s*\d+))+$/i;
  var pinnedMark = /^\[?(?:공지|고정|필독|notice)\]?$/i;
  var backToList = /^(?:목록|목록\s*보기|목록으로(?:\s*가기)?|리스트|list)$/i;
  var neighbour = /^(?:(?:이전|다음|윗|아랫)\s*글(?![가-힣])|(?:이전|다음)(?=[\s:]))/;
  var gateLink = /바로\s*가기$/;
  var boardDate = /(?:19|20)\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}|\b\d{2}[.\-/]\d{2}[.\-/]\d{2}\b/;
  var classifiedBy = /* @__PURE__ */ new Map();
  function slot(candidate, category, title, description) {
    const known = classifiedBy.get(candidate.element);
    if (known) return { ...known, title, description };
    return { ...candidate, category, title, description, score: Math.max(candidate.score, 70), reasons: [...candidate.reasons, "\uD398\uC774\uC9C0 \uC720\uD615 \uCE78"] };
  }
  var inBody = (candidate) => !candidate.element.closest(outside) && candidate.context === "body";
  var destination2 = (candidate) => candidate.action === "navigate" && candidate.href ? candidate.href : "";
  function documentList(raw) {
    const groups = /* @__PURE__ */ new Map();
    for (const candidate of raw) {
      if (!inBody(candidate) || !isSafeSource(candidate) || text2(candidate.label).length < 6 || !/[가-힣a-z]/i.test(candidate.label)) continue;
      const row = candidate.element.closest('tr, li, [role~="row" i]');
      if (!row?.parentElement || row.closest(outside)) continue;
      const rows = groups.get(row.parentElement) ?? /* @__PURE__ */ new Map();
      const known = rows.get(row);
      const attachment = (item) => attachmentLink.test(text2(item.label));
      if (!known || attachment(known) && !attachment(candidate) || attachment(known) === attachment(candidate) && text2(known.label).length < text2(candidate.label).length) rows.set(row, candidate);
      groups.set(row.parentElement, rows);
    }
    let best;
    for (const rows of groups.values()) if (rows.size >= 5 && (!best || rows.size > best.size)) best = rows;
    if (!best) return [];
    const lengths = [...best.values()].map((candidate) => text2(candidate.label).length).sort((a, b) => a - b);
    if (lengths[Math.floor(lengths.length / 2)] < 12) return [];
    const shapes = /* @__PURE__ */ new Map();
    for (const candidate of best.values()) {
      let shape = "locate";
      if (candidate.action === "navigate" && candidate.href) {
        try {
          const url = new URL(candidate.href);
          shape = url.host + url.pathname.replace(/\/[^/]*\d[^/]*$/, "/#");
        } catch {
          shape = candidate.href;
        }
      }
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
    }
    if (Math.max(...shapes.values()) < best.size * 0.6) return [];
    const dated = [...best.keys()].filter((row) => boardDate.test(row.textContent ?? "")).length;
    const pages = raw.filter((candidate) => inBody(candidate) && /^(?:\d{1,3}|다음\s*페이지|next)$/i.test(text2(candidate.label))).length;
    if (dated < best.size * 0.6 && pages < 2) return [];
    const pinned = (row) => {
      const cell = row.firstElementChild;
      if (!cell || cell.contains(best.get(row).element)) return /^\[(?:공지|고정|필독)\]/.test(text2(row.textContent ?? ""));
      return pinnedMark.test(text2(cell.textContent ?? "")) || [...cell.querySelectorAll("img[alt]")].some((image) => pinnedMark.test(text2(image.getAttribute("alt") ?? "")));
    };
    return [...best].map(([row, candidate]) => ({ candidate, pinned: pinned(row) }));
  }
  function listSlots(raw, rest, rows) {
    const searches = rest.filter((candidate) => candidate.category === "search");
    const field = (candidate) => candidate.element.matches('input, [role~="searchbox" i], [role~="textbox" i]') && !searchPeriod.test(text2(candidate.label)) && !candidate.element.matches('input[type="date" i]');
    const search = searches.find((candidate) => inBody(candidate) && field(candidate)) ?? searches.find(inBody) ?? searches.find(field) ?? searches[0];
    const ordered2 = [...rows.filter((row) => !row.pinned), ...rows.filter((row) => row.pinned)];
    const seen = /* @__PURE__ */ new Set();
    const posts = [];
    for (const { candidate } of ordered2) {
      const title = text2(candidate.label).replace(titleBadges, "") || text2(candidate.label);
      if (seen.has(title)) continue;
      seen.add(title);
      posts.push(slot(candidate, "notice", title, "\uAE00 \uC77D\uAE30"));
    }
    const slots = search ? [search] : [];
    return { slots: [...slots, ...posts.slice(0, MAX_CARDS2 - slots.length)], extra: posts.slice(MAX_CARDS2 - slots.length) };
  }
  function postSlots(raw) {
    const body = raw.filter((candidate) => inBody(candidate) && isSafeSource(candidate));
    const back = body.find((candidate) => backToList.test(text2(candidate.label)));
    if (!back) return;
    const downloads = body.filter((candidate) => isDocumentDownload(candidate.element, candidate.label) || /다운로드|내려\s*받기/.test(candidate.label)).slice(0, 2).map((candidate) => slot(candidate, "apply", text2(candidate.label).replace(/\s*(?:다운로드|내려\s*받기)$/, "") || "\uCCA8\uBD80\uD30C\uC77C", "\uCCA8\uBD80\uD30C\uC77C \uB0B4\uB824\uBC1B\uAE30"));
    const neighbours = [];
    for (const candidate of body) {
      const container = candidate.element.closest("li, tr, dl, dd, p, div");
      const lead = text2(container?.textContent ?? "").slice(0, 120);
      const match = lead.match(neighbour);
      if (!match || candidate === back || text2(candidate.label).length < 4 || !candidate.element.matches("a[href]")) continue;
      const name2 = /다음|아랫/.test(match[0]) ? "\uB2E4\uC74C \uAE00" : "\uC774\uC804 \uAE00";
      if (neighbours.some((item) => item.title === name2)) continue;
      neighbours.push(slot(candidate, "notice", name2, text2(candidate.label).replace(titleBadges, "")));
    }
    return [...downloads, slot(back, "notice", "\uBAA9\uB85D\uC73C\uB85C", "\uAE00 \uBAA9\uB85D\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30"), ...neighbours];
  }
  var featuredHeading = /^(?:자주\s*(?:찾는|이용하는|쓰는)|주요|빠른|대표|인기)\s*(?:서비스|메뉴|민원)(?:\s*바로\s*가기)?$|^(?:서비스|민원)\s*바로\s*가기$|^(?:빠른|퀵)\s*메뉴(?:\s*서비스)?$|^quick\s*menu$/i;
  var featuredHelp = /안내|상담|문의|전화|찾기|센터|콜/;
  var featuredControl = /^(?:설정|편집|메뉴\s*(?:설정|편집)|닫기|열기|이전|다음|정지|재생|멈춤)$/;
  function featuredServices(raw, known) {
    const seen = /* @__PURE__ */ new Set();
    return raw.filter((candidate) => {
      const label = text2(candidate.label);
      if (known.has(candidate.element) || candidate.context === "footer" || candidate.action !== "navigate" || !candidate.element.matches("a[href]") || !isSafeSource(candidate) || featuredControl.test(label) || label.length < 2 || label.length > 30 || !featuredHeading.test(text2(candidate.sectionLabel ?? ""))) return false;
      const key = destination2(candidate) || label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((candidate) => ({
      ...candidate,
      category: featuredHelp.test(candidate.label) ? "help" : "apply",
      score: 72,
      pageTask: "control",
      reasons: ["\uD648\uC758 \uC790\uC8FC \uCC3E\uB294 \uC11C\uBE44\uC2A4 \uBB36\uC74C", "\uBB36\uC74C \uC81C\uBAA9\uACFC \uC77C\uBC18 \uB9C1\uD06C"]
    }));
  }
  function gateSlots(raw) {
    if (raw.length > 40) return;
    const links = raw.filter((candidate) => candidate.context !== "footer" && isSafeSource(candidate) && gateLink.test(text2(candidate.label)) && text2(candidate.label).length >= 8);
    const distinct = links.filter((candidate, index) => links.findIndex((other) => (destination2(other) || other.element) === (destination2(candidate) || candidate.element)) === index);
    if (distinct.length < 3) return;
    return distinct.slice(0, MAX_CARDS2).map((candidate) => {
      const heading2 = [...candidate.element.querySelectorAll("strong, b, h2, h3, h4, em, span, p")].map((node) => text2(node.textContent ?? "")).find((value) => value.length >= 2 && value.length <= 24);
      return slot(candidate, "apply", heading2 ?? text2(candidate.label).replace(gateLink, "").slice(0, 24), "\uC774 \uC0AC\uC774\uD2B8\uB85C \uC774\uB3D9");
    });
  }
  function composeFirstScreen(raw, classified) {
    const home = isHomePage();
    const featured = home ? featuredServices(raw, new Set(classified.map((candidate) => candidate.element))) : [];
    const common = commonActions(raw, classified);
    const homeTasks = (candidate) => home && candidate.category === "help" && candidate.pageTask === "control" && locationAction.test(text2(candidate.label)) ? { ...candidate, pageTask: void 0 } : candidate;
    const rest = [...withoutCommon(classified, common).map(homeTasks), ...featured];
    classifiedBy = new Map(classified.map((candidate) => [candidate.element, candidate]));
    let type = "default";
    let slots = [];
    let extra = [];
    let target = MAX_CARDS2;
    const gate = gateSlots(raw);
    const rows = gate || home ? [] : documentList(raw);
    const post = gate || rows.length ? void 0 : home ? void 0 : postSlots(raw);
    if (gate) {
      type = "gate";
      slots = gate;
    } else if (rows.length) {
      type = "list";
      ({ slots, extra } = listSlots(raw, rest, rows));
    } else if (post) {
      type = "post";
      slots = post;
      target = Math.max(POST_CARDS, Math.min(post.length, MAX_CARDS2));
    }
    slots = slots.slice(0, MAX_CARDS2);
    const elements = new Set(slots.map((candidate) => candidate.element));
    const destinations = new Set(slots.map(destination2).filter(Boolean));
    const remaining = rest.filter((candidate) => !elements.has(candidate.element) && !(destination2(candidate) && destinations.has(destination2(candidate))));
    const cards = slots.length >= target ? slots : [...slots, ...rank(remaining).slice(0, target - slots.length)];
    classifiedBy = /* @__PURE__ */ new Map();
    return { type, common, cards, pool: [...extra, ...remaining] };
  }

  // src/types.ts
  var CATEGORY_INFO = {
    login: { title: "\uB85C\uADF8\uC778", description: "\uB0B4 \uACC4\uC815\uACFC \uAC1C\uC778 \uC11C\uBE44\uC2A4", icon: "user" },
    search: { title: "\uAC80\uC0C9", description: "\uC6D0\uD558\uB294 \uC815\uBCF4 \uCC3E\uAE30", icon: "search" },
    notice: { title: "\uACF5\uC9C0\uC0AC\uD56D", description: "\uC0C8 \uC18C\uC2DD\uACFC \uC8FC\uC694 \uC548\uB0B4", icon: "bell" },
    academic: { title: "\uD559\uC0AC\uC815\uBCF4", description: "\uC218\uC5C5\xB7\uD559\uC801\xB7\uD559\uAD50\uC0DD\uD65C", icon: "book" },
    apply: { title: "\uC2E0\uCCAD\xB7\uC870\uD68C", description: "\uC774\uC6A9 \uC2E0\uCCAD\uACFC \uB0B4\uC5ED \uD655\uC778", icon: "file" },
    help: { title: "\uC774\uC6A9 \uC548\uB0B4", description: "\uB3C4\uC6C0\uB9D0\uACFC \uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38", icon: "help" }
  };

  // src/easy-mode.ts
  var renderedSources = /* @__PURE__ */ new WeakMap();
  var cardSource = (card) => renderedSources.get(card);
  var paths = {
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
    home: '<path d="M3 11 12 3l9 8M5 9v12h14V9"/>',
    phone: '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
    signup: '<circle cx="10" cy="8" r="4"/><path d="M2 21v-2a8 8 0 0 1 13-6M19 14v6M16 17h6"/>'
  };
  function icon(name2) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths[name2] ?? paths.help;
    return svg;
  }
  function el(tag, className = "", text3) {
    const element = document.createElement(tag);
    element.className = className;
    if (text3 !== void 0) element.textContent = text3;
    return element;
  }
  function openEasyMode(host, options = {}) {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = { x: window.scrollX, y: window.scrollY };
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles_default;
    const dialog = el("dialog");
    dialog.lang = "ko";
    dialog.dir = "ltr";
    dialog.setAttribute("aria-labelledby", "easyweb-title");
    dialog.setAttribute("aria-describedby", "easyweb-description");
    shadow.append(style, dialog);
    let stopWatching = () => {
    };
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
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll("a[href], button:not(:disabled)")];
      const first2 = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && shadow.activeElement === first2) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && shadow.activeElement === last) {
        event.preventDefault();
        first2?.focus();
      }
    });
    const topbar = el("div", "topbar");
    const topInner = el("div", "top-inner");
    const brand = el("div", "brand");
    const mark = el("span", "brand-mark");
    mark.append(icon("brand"));
    const name2 = el("div", "", "EasyWeb");
    name2.append(el("small", "", "\uBCF5\uC7A1\uD55C \uD654\uBA74\uC744 \uB354 \uC27D\uAC8C"));
    brand.append(mark, name2);
    const closeButton = el("button", "close");
    closeButton.type = "button";
    closeButton.append(icon("close"), el("span", "", "\uC6D0\uBCF8 \uD654\uBA74 \uBCF4\uAE30"));
    closeButton.addEventListener("click", close);
    topInner.append(brand, closeButton);
    topbar.append(topInner);
    const shell = el("div", "shell");
    const site = el("div", "site");
    site.append(el("span", "dot"), el("span", "", "\uC9C0\uAE08 \uBCF4\uACE0 \uC788\uB294 \uC0AC\uC774\uD2B8"), el("strong", "", location.hostname), el("span", "site-tag", "\uC26C\uC6B4 \uD654\uBA74"));
    const intro = el("div", "intro");
    const title = el("h1", "", "\uBB34\uC5C7\uC744 \uD558\uC2DC\uACA0\uC5B4\uC694?");
    title.id = "easyweb-title";
    const description = el("p", "", "\uC6D0\uD558\uB294 \uAE30\uB2A5\uC744 \uC120\uD0DD\uD558\uC138\uC694. \uC6D0\uBCF8\uC5D0\uC11C \uD655\uC778\uC774 \uD544\uC694\uD55C \uBA54\uB274\uB294 \uC704\uCE58\uB97C \uD45C\uC2DC\uD574\uC694.");
    description.id = "easyweb-description";
    intro.append(title, description);
    const commonRow = el("nav", "common");
    commonRow.setAttribute("aria-label", "\uC790\uC8FC \uC4F0\uB294 \uBC84\uD2BC");
    const commonList = el("div", "common-list");
    commonRow.append(el("span", "common-label", "\uC790\uC8FC \uC4F0\uB294 \uBC84\uD2BC"), commonList);
    const label = el("div", "section-label");
    const sectionTitle = el("h2", "", "\uBC14\uB85C \uC774\uC6A9\uD558\uAE30");
    sectionTitle.id = "easyweb-actions";
    const arrow = (symbol) => {
      const mark2 = el("span", "arrow", symbol);
      mark2.setAttribute("aria-hidden", "true");
      return mark2;
    };
    const pageIndicator = el("span", "page-indicator");
    pageIndicator.setAttribute("aria-hidden", "true");
    const refresh = el("button", "refresh");
    refresh.type = "button";
    refresh.append(icon("refresh"), document.createTextNode("\uB2E4\uC2DC \uCC3E\uAE30"));
    const shortcut = el("button", "menu-shortcut");
    shortcut.type = "button";
    shortcut.append(document.createTextNode("\uB2E4\uB978 \uAE30\uB2A5 \uBCF4\uAE30"), arrow("\u2192"));
    const sectionActions = el("div", "section-actions");
    sectionActions.append(refresh, shortcut);
    const heading2 = el("div", "section-heading");
    heading2.append(sectionTitle, pageIndicator);
    label.append(heading2, sectionActions);
    const grid = el("section", "grid");
    grid.setAttribute("aria-labelledby", sectionTitle.id);
    const pagesNavigation = el("nav", "menu-pages");
    pagesNavigation.setAttribute("aria-label", "\uB2E4\uB978 \uAE30\uB2A5 \uCC3E\uC544\uBCF4\uAE30");
    const previous = el("button", "menu-page");
    previous.type = "button";
    previous.append(arrow("\u2190"), document.createTextNode("\uC774\uC804 \uAE30\uB2A5"));
    const next = el("button", "menu-page");
    next.type = "button";
    next.append(document.createTextNode("\uB2E4\uB978 \uAE30\uB2A5 \uBCF4\uAE30"), arrow("\u2192"));
    pagesNavigation.append(previous, next);
    const changeNotice = el("p", "change-notice");
    changeNotice.hidden = true;
    changeNotice.setAttribute("role", "status");
    const hint = el("aside", "hint");
    const hintText = el("p");
    hintText.append(el("strong", "", "\uB85C\uADF8\uC778\xB7\uC778\uC99D\xB7\uC2E0\uCCAD\uC740 \uC6D0\uB798 \uC0AC\uC774\uD2B8\uC5D0\uC11C \uC9C4\uD589\uD574\uC694."), el("br"), document.createTextNode("\uC6D0\uD558\uB294 \uAE30\uB2A5\uC774 \uC5C6\uC73C\uBA74 \u2018\uC6D0\uBCF8 \uD654\uBA74 \uBCF4\uAE30\u2019\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694."));
    hint.append(icon("help"), hintText);
    const bottom = el("div", "bottom");
    const status = el("span", "status");
    status.setAttribute("role", "status");
    bottom.append(status, el("span", "", "\uC5B8\uC81C\uB4E0 Esc \uD0A4\uB85C \uC6D0\uBCF8 \uD654\uBA74\uC5D0 \uB3CC\uC544\uAC08 \uC218 \uC788\uC5B4\uC694"));
    shell.append(site, commonRow, intro, changeNotice, label, grid, pagesNavigation, hint, bottom);
    dialog.append(topbar, shell);
    let items = [];
    let common = [];
    let pages = [];
    let pageIndex = 0;
    let remainder;
    let pending;
    let hasRemaining = false;
    let stale = false;
    function updatePageControls() {
      const hasPrevious = pageIndex > 0;
      const hasNext = pageIndex < pages.length - 1 || hasRemaining;
      pagesNavigation.hidden = !hasPrevious && !hasNext;
      previous.hidden = !hasPrevious;
      next.hidden = !hasNext;
      previous.disabled = stale || !hasPrevious;
      next.disabled = stale || !hasNext;
      previous.setAttribute("aria-disabled", String(previous.disabled));
      next.setAttribute("aria-disabled", String(next.disabled));
      shortcut.hidden = next.hidden;
      shortcut.disabled = next.disabled;
      shortcut.setAttribute("aria-disabled", String(shortcut.disabled));
      pageIndicator.hidden = pagesNavigation.hidden;
      pageIndicator.textContent = `${pageIndex + 1}\uBC88\uC9F8 \uD654\uBA74`;
    }
    function markStale() {
      if (stale || closed) return;
      stale = true;
      changeNotice.textContent = "\uC6D0\uBCF8 \uD398\uC774\uC9C0\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694. \uB2E4\uC2DC \uCC3E\uAE30\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694.";
      changeNotice.hidden = false;
      for (const item of shell.querySelectorAll(".card, .common-action")) {
        item.setAttribute("aria-disabled", "true");
        if (item instanceof HTMLAnchorElement) {
          item.removeAttribute("href");
          item.setAttribute("role", "link");
          item.tabIndex = 0;
        }
      }
      const pagingHadFocus = shadow.activeElement === previous || shadow.activeElement === next || shadow.activeElement === shortcut;
      updatePageControls();
      if (pagingHadFocus) refresh.focus({ preventScroll: true });
    }
    function sourceControl(candidate, className) {
      const item = candidate.action === "navigate" ? el("a", className) : el("button", className);
      renderedSources.set(item, candidate);
      const guard = (event) => {
        if (!stale && isCandidateCurrent(candidate)) return true;
        event.preventDefault();
        markStale();
        return false;
      };
      if (item instanceof HTMLAnchorElement) {
        item.href = candidate.href;
        item.target = candidate.target ?? "_self";
        if (item.target === "_blank") item.rel = "noopener noreferrer";
        item.addEventListener("click", guard);
        item.addEventListener("auxclick", guard);
      } else {
        item.type = "button";
        item.addEventListener("click", (event) => {
          if (!guard(event)) return;
          const result = locateOriginal(candidate, close);
          showOriginalNotice(result, candidate.label, candidate.element);
        });
      }
      item.addEventListener("contextmenu", guard);
      item.addEventListener("dragstart", guard);
      return item;
    }
    function commonButton({ kind, candidate }) {
      const item = sourceControl(candidate, "common-action");
      item.dataset.kind = kind;
      const names = { home: "home", login: "user", signup: "signup", phone: "phone" };
      item.append(icon(names[kind]), document.createTextNode(kind === "phone" ? `\uC804\uD654 ${phoneNumber(candidate)}` : COMMON_TITLES[kind]));
      return item;
    }
    function card(candidate) {
      const info = CATEGORY_INFO[candidate.category];
      const item = sourceControl(candidate, "card");
      item.dataset.category = candidate.category;
      const image = el("span", "card-icon");
      image.append(icon(info.icon));
      const action = el("span", "card-action", candidate.action === "navigate" ? candidate.target === "_blank" ? "\uC6D0\uBCF8 \uD398\uC774\uC9C0 \uC0C8 \uCC3D\uC73C\uB85C \uC774\uB3D9" : "\uC6D0\uBCF8 \uD398\uC774\uC9C0\uB85C \uC774\uB3D9" : "\uC6D0\uBCF8\uC5D0\uC11C \uACC4\uC18D\uD558\uAE30");
      action.append(icon(candidate.action === "navigate" ? "external" : "arrow"));
      const cardTitle2 = candidate.title ?? (items.filter((other) => other.category === candidate.category).length > 1 ? candidate.label : info.title);
      const titleNode = el("span", "card-title", cardTitle2);
      const sourceNode = el("span", "card-source", `\uCC3E\uC740 \uBA54\uB274 \xB7 ${candidate.label}`);
      item.append(image, titleNode, el("span", "card-description", candidate.description ?? info.description), sourceNode);
      if (candidate.relatedLabel && candidate.relatedLabel !== candidate.label) {
        item.append(el("span", "card-context card-source", `\uAD00\uB828 \uD56D\uBAA9 \xB7 ${candidate.relatedLabel}`));
      }
      if (candidate.destinationHost && candidate.destinationHost !== location.hostname) {
        const destination3 = el("span", "card-source", `\uC5F0\uACB0\uB41C \uC0AC\uC774\uD2B8 \xB7 ${candidate.destinationHost}`);
        item.append(destination3);
      }
      if (candidate.opensNewWindow) {
        const target = el("span", "card-source", "\uC0C8 \uCC3D\xB7\uB2E4\uB978 \uCC3D\uC73C\uB85C \uC5F0\uACB0\uB418\uB294 \uBA54\uB274");
        item.append(target);
      }
      item.append(action);
      return item;
    }
    function renderPage(announce = false) {
      items = pages[pageIndex];
      grid.replaceChildren(...items.map(card));
      if (!items.length) {
        const empty = el("div", "empty");
        const returnButton = el("button", "close", "\uC6D0\uBCF8 \uD654\uBA74\uC5D0\uC11C \uCC3E\uC544\uBCF4\uAE30");
        returnButton.type = "button";
        returnButton.addEventListener("click", close);
        empty.append(el("h3", "", "\uC8FC\uC694 \uAE30\uB2A5\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694"), el("p", "", "\uC774 \uD398\uC774\uC9C0\uC758 \uBA54\uB274\uB97C \uC6D0\uBCF8 \uD654\uBA74\uC5D0\uC11C \uD655\uC778\uD574\uC8FC\uC138\uC694."), returnButton);
        grid.append(empty);
      }
      updatePageControls();
      status.textContent = `${announce ? "\uB2E4\uC2DC \uD655\uC778\uD588\uC5B4\uC694. " : ""}\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0\uC11C ${items.length}\uAC1C\uC758 \uC8FC\uC694 \uAE30\uB2A5\uC744 \uCC3E\uC558\uC5B4\uC694.${pageIndex ? ` ${pageIndex + 1}\uBC88\uC9F8 \uD654\uBA74\uC774\uC5D0\uC694.` : ""}${pageIndex < pages.length - 1 || hasRemaining ? " \uB2E4\uB978 \uAE30\uB2A5\uB3C4 \uBCFC \uC218 \uC788\uC5B4\uC694." : ""}`;
    }
    function update(announce = false) {
      const raw = analyzePage();
      const classified = classify(raw, options);
      const screen = composeFirstScreen(raw, classified);
      common = screen.common;
      commonList.replaceChildren(...common.map(commonButton));
      commonRow.hidden = !common.length;
      const candidates = screen.pool;
      const initial = screen.cards;
      pages = [initial];
      pageIndex = 0;
      remainder = remainingMenus(candidates, initial);
      pending = void 0;
      hasRemaining = hasMoreMenus(candidates, initial);
      stale = false;
      changeNotice.hidden = true;
      changeNotice.textContent = "";
      renderPage(announce);
    }
    function loadNextPage() {
      const result = [];
      if (pending) {
        result.push(pending);
        pending = void 0;
      }
      while (result.length < 6) {
        const following2 = remainder.next();
        if (following2.done) {
          hasRemaining = false;
          return result;
        }
        result.push(following2.value);
      }
      const following = remainder.next();
      pending = following.done ? void 0 : following.value;
      hasRemaining = !!pending;
      return result;
    }
    function changePage(direction) {
      if (stale) return;
      const targetIndex = pageIndex + direction;
      if (targetIndex < 0 || targetIndex >= pages.length && !hasRemaining) return;
      const previouslyHadRemaining = hasRemaining;
      const target = pages[targetIndex] ?? loadNextPage();
      if (!areCandidatesCurrent([...items, ...target])) {
        hasRemaining = previouslyHadRemaining;
        markStale();
        return;
      }
      if (!pages[targetIndex]) pages.push(target);
      pageIndex = targetIndex;
      renderPage();
      grid.querySelector(".card")?.focus();
    }
    previous.addEventListener("click", () => changePage(-1));
    next.addEventListener("click", () => changePage(1));
    shortcut.addEventListener("click", () => changePage(1));
    refresh.addEventListener("click", () => update(true));
    update();
    dialog.showModal();
    closeButton.focus();
    stopWatching = watchCandidates(() => stale ? [] : [...common.map((item) => item.candidate), ...items], markStale);
    return close;
  }
  return __toCommonJS(stdin_exports);
})();
