"use strict";
(() => {
  // src/styles.css
  var styles_default = ":host { all: initial; color-scheme: light; }\n* { box-sizing: border-box; }\ndialog { inset: 0; width: 100vw; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0; background: #f5f7fa; color: #172739; font: 18px/1.6 -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; overflow-y: auto; overscroll-behavior: contain; }\ndialog::backdrop { background: #f5f7fa; }\nbutton, a { font: inherit; -webkit-tap-highlight-color: transparent; }\nbutton { cursor: pointer; }\nbutton:focus-visible, a:focus-visible, summary:focus-visible { outline: 3px solid #08796e; outline-offset: 5px; }\nsvg { display: block; width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }\n.topbar { background: #fff; border-bottom: 1px solid #e4e9ee; }\n.top-inner { max-width: 1160px; margin: auto; padding: 22px 36px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }\n.brand { display: flex; align-items: center; gap: 12px; font-size: 23px; font-weight: 760; letter-spacing: -.7px; }\n.brand-mark { background: #0a7b70; color: white; border-radius: 12px; padding: 8px; }\n.brand-mark svg { width: 25px; height: 25px; }\n.brand small { display: block; font-size: 12px; line-height: 1.4; font-weight: 500; letter-spacing: 0; color: #697887; }\n.close { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 48px; padding: 10px 18px; background: #fff; color: #34465a; border: 1px solid #7f8c99; border-radius: 10px; font-size: 16px; font-weight: 650; }\n.close svg { width: 18px; height: 18px; }\n.close:hover { background: #f0f5f6; border-color: #3e8c81; }\n.shell { max-width: 1088px; margin: 0 auto; padding: 40px 36px 24px; }\n.site { display: flex; gap: 9px; align-items: center; color: #5c6b7b; font-size: 14px; flex-wrap: wrap; }\n.site .dot { width: 7px; height: 7px; border-radius: 50%; background: #0a7b70; }\n.site strong { color: #334b5d; font-weight: 600; overflow-wrap: anywhere; }\n.site-tag { color: #087367; font-size: 12px; background: #e0eee9; padding: 3px 9px; border-radius: 6px; margin-left: 4px; }\n.intro { margin: 29px 0 30px; }\nh1 { font-size: clamp(30px, 4vw, 42px); font-weight: 760; letter-spacing: -1.8px; line-height: 1.35; margin: 0 0 12px; }\n.intro p { color: #5e6e7e; margin: 0; font-size: 18px; word-break: keep-all; }\n.section-label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; color: #4d6071; font-size: 14px; }\n.section-label h2 { font-size: 15px; font-weight: 650; margin: 0; }\n.refresh { min-height: 48px; min-width: 48px; display: inline-flex; align-items: center; gap: 6px; background: none; color: #476173; border: 0; padding: 7px; font-size: 14px; }\n.refresh svg { width: 15px; height: 15px; }\n.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }\n.menu-pages { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 20px; }\n.menu-page { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; min-width: 48px; max-width: 100%; padding: 10px 18px; border: 1px solid #7f8c99; border-radius: 10px; color: #34465a; background: #fff; font-size: 16px; font-weight: 650; overflow-wrap: anywhere; }\n.menu-page:enabled:hover { background: #f0f5f6; border-color: #3e8c81; }\n.menu-page:disabled { background: #edf1f5; color: #526476; cursor: not-allowed; }\n.menu-pages[hidden], .menu-page[hidden] { display: none; }\n.card { display: flex; flex-direction: column; align-items: start; min-height: 224px; padding: 24px; background: white; color: #172739; text-decoration: none; border: 1px solid #7f8c99; border-radius: 18px; text-align: left; transition: border-color .15s, box-shadow .15s; overflow-wrap: anywhere; }\n.card:hover { border-color: #3e8c81; box-shadow: 0 8px 24px #263d4d0b; }\n.card[aria-disabled='true'] { background: #edf1f5; border-color: #c2cbd4; cursor: not-allowed; }\n.change-notice { padding: 15px 18px; background: #fff0d8; color: #704709; border: 1px solid #e6cc9f; border-radius: 10px; font-size: 16px; }\n.change-notice[hidden] { display: none; }\n.card-icon { width: 52px; height: 52px; display: grid; place-items: center; background: #eaf1ff; color: #4263ad; border-radius: 14px; margin-bottom: 18px; }\n.card[data-category='search'] .card-icon, .card[data-category='apply'] .card-icon { background: #e1f1ed; color: #168273; }\n.card[data-category='notice'] .card-icon, .card[data-category='help'] .card-icon { background: #fff1dc; color: #a57019; }\n.card-title { font-size: 24px; font-weight: 730; letter-spacing: -.7px; line-height: 1.3; }\n.card-description { font-size: 15px; color: #647486; margin-top: 7px; }\n.card-source { font-size: 13px; color: #627482; margin-top: 12px; max-width: 100%; }\n.card-action { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #08796e; margin-top: auto; padding-top: 17px; }\n.card-action svg { width: 15px; height: 15px; }\n.empty { grid-column: 1 / -1; text-align: center; background: white; padding: 42px 24px; border: 1px solid #dce3ea; border-radius: 18px; }\n.empty h3 { margin: 10px 0; font-size: 24px; }\n.empty p { color: #607181; margin: 0 0 24px; }\n.hint { display: flex; align-items: flex-start; gap: 12px; margin-top: 26px; padding: 18px 21px; background: #eaf0f4; border: 1px solid #e0e7ed; border-radius: 12px; color: #53677a; font-size: 14px; }\n.hint svg { width: 20px; height: 20px; margin-top: 2px; }\n.hint p { margin: 0; }\n.hint strong { color: #344f65; }\n.bottom { display: flex; justify-content: space-between; gap: 20px; padding: 24px 2px 8px; color: #526476; font-size: 13px; }\n.status { min-height: 24px; }\n@media (forced-colors: active) {\n  .card, .close, .refresh, .menu-page { border: 1px solid ButtonText; background: ButtonFace; color: ButtonText; }\n  .card[aria-disabled='true'] { border-color: GrayText; color: GrayText; }\n  .menu-page:disabled { border-color: GrayText; color: GrayText; }\n  button:focus-visible, a:focus-visible { outline: 3px solid Highlight; }\n  .card-icon { border: 1px solid CanvasText; }\n}\n@media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }\n@media (max-width: 800px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .shell { padding-top: 28px; } }\n@media (max-width: 520px) {\n  .top-inner { padding: 16px 20px; gap: 10px; } .brand { font-size: 20px; gap: 9px; } .brand small { display: none; }\n  .close { padding: 9px 12px; font-size: 14px; } .shell { padding: 26px 20px 20px; }\n  .intro { margin: 24px 0; } .intro p { font-size: 16px; } h1 { letter-spacing: -1px; }\n  .grid { grid-template-columns: 1fr; gap: 12px; } .card { min-height: 190px; padding: 22px; }\n  .bottom { flex-direction: column; gap: 6px; } .site-tag { margin-left: 0; }\n}\n";

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
    const text = downloadOperationLabel.test(safeLabel.normalize("NFKC").replace(/\s+/g, " ").trim());
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
    return text || icons.length ? { text, icons } : void 0;
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

  // src/analyzer.ts
  var clean = (text) => text.replace(/\s+/g, " ").trim().slice(0, 140);
  var editableRoleSelector = ["textbox", "searchbox", "combobox", "spinbutton", "slider"].map((role) => `[role~="${role}" i]`).join(", ");
  var editableSelector = `input, textarea, select, [contenteditable]:not([contenteditable="false" i]), ${editableRoleSelector}`;
  var headingSelector = ':is(h1,h2,h3,h4,h5,h6,[role~="heading" i])';
  var localRegionSelector = 'section, article, aside, [role~="region" i], [role~="article" i], [role~="complementary" i]';
  var informationConcept = /(?:행동\s*요령|안전\s*수칙|대처\s*(?:방법|요령)|이용\s*(?:안내|방법)|사용\s*설명서|instructions?|(?:action|safety)\s+tips?)(?:\s*(?:안내|모음))?$/i;
  var helpHeading = /^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A|도움말|Help)$/i;
  var collectionSelector = 'ul, ol, [role~="list" i], [role~="tablist" i]';
  var collectionControlSelector = 'a[href], button, [role~="button" i], [role~="tab" i]';
  var collectionExcludedSelector = 'header, footer, article, form, [role~="banner" i], [role~="contentinfo" i], [role~="article" i], [role~="form" i]';
  var topicUtility = /^(?:전체|이전|다음|처음|마지막|확인|취소|닫기|뒤로|더\s*보기|바로\s*가기|자세히\s*보기|공유(?:하기)?|인쇄(?:하기)?|프린트|화면\s*(?:확대|축소)|previous|next|first|last|ok|cancel|close|back|more|open|share|print|zoom\s*(?:in|out)|\d+)$/i;
  var informationFacet = /(?:특징|종류|조건|기준|절차|방법|제도)(?:\s*안내)?$/;
  function isInformationTopicLabel(label) {
    const text = label.normalize("NFKC").replace(/\s+/g, " ").trim();
    return text.length >= 2 && text.length <= 36 && !/[.!?。？]/.test(text) && !topicUtility.test(text);
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
    const text = clean(staticText(element));
    if (text) return text;
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
    const searchCue = (text) => /검색|\bsearch\b/i.test(text.normalize("NFKC").replace(/[_-]+/g, " "));
    const textual = element instanceof HTMLInputElement && ["text", "search"].includes(element.type) || element instanceof HTMLTextAreaElement || element.isContentEditable || element.matches('[role~="textbox" i], [role~="searchbox" i]');
    return textual && (element.matches('input[type="search"], [role~="searchbox" i]') || !!element.closest('[role~="search"], search') || searchCue(label) || searchCue(element.getAttribute("placeholder") ?? ""));
  }
  function headingBelongsTo(heading, element) {
    const region = heading.closest(localRegionSelector);
    if (!region || region.contains(element)) return true;
    if (element.closest(localRegionSelector) || !region.matches("section")) return false;
    const onlyHeading = (node) => {
      if (node === heading) return true;
      if (node.nodeType === Node.TEXT_NODE) return !(node.nodeValue ?? "").trim();
      if (!(node instanceof Element)) return true;
      return node.contains(heading) && [...node.childNodes].every(onlyHeading);
    };
    return onlyHeading(region);
  }
  function contextLabels(element, cache) {
    const labels = [];
    const add = (text) => {
      if (text && text.length <= 60 && !labels.includes(text)) labels.push(text);
    };
    let parent = element.parentElement;
    for (let level = 0; parent && parent !== document.body && level < 10; level++, parent = parent.parentElement) {
      let headings = cache?.get(parent);
      if (!headings) {
        headings = [...parent.querySelectorAll(`:scope > ${headingSelector}, :scope > :is(div,section) > ${headingSelector}, :scope > :is(div,section) > :is(div,section) > ${headingSelector}`)].map((heading) => ({ element: heading, label: clean(getSafeLabel(heading)), visible: isVisible(heading) }));
        cache?.set(parent, headings);
      }
      const preceding = headings.filter(({ element: heading, visible }) => {
        let branch = heading;
        while (branch.parentElement && branch.parentElement !== parent) branch = branch.parentElement;
        if (branch !== heading && branch.contains(element)) return false;
        return !heading.closest('header, nav, footer, [role~="banner"], [role~="navigation"], [role~="contentinfo"]') && visible && headingBelongsTo(heading, element) && !!(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      const label = preceding.at(-1);
      if (label) add(label.label);
      if (!label && level < 2 && parent.querySelectorAll("a, button, input").length <= 3) {
        const firstParagraph = parent.querySelector(":scope > p");
        if (firstParagraph && isVisible(firstParagraph) && firstParagraph.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
          const text = clean(staticText(firstParagraph));
          if (text && text.length <= 40) add(text);
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
    const headings = document.querySelectorAll(`main > ${headingSelector}, [role~="main"] > ${headingSelector}, .page-title > ${headingSelector}`);
    for (const heading of headings) {
      if (!isVisible(heading)) continue;
      const text = clean(getSafeLabel(heading));
      if (text.length > 60) continue;
      if (/학사\s*일정|academic\s+calendar/i.test(text)) return "academic-calendar";
      if (helpHeading.test(text) || informationConcept.test(text)) return "help";
    }
    return void 0;
  }
  function pagePurpose(element, labels = contextLabels(element), common = documentPurpose()) {
    if (common) return common;
    if (labels.some((text) => helpHeading.test(text) || informationConcept.test(text))) return "help";
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
    const marked = (control) => !![...control.querySelectorAll(":scope > abbr[title]")].find((marker) => /^(?:질문|question)$/i.test((marker.getAttribute("title") ?? "").trim()) && isVisible(marker));
    if (!marked(element) || !element.matches('a, button, [role~="button"]') || candidateLabel(element).length < 4) return false;
    const list = element.closest('ul, ol, [role~="list"]');
    if (!list) return false;
    let count = 0;
    for (const row of list.querySelectorAll(':scope > li, :scope > [role~="listitem"]')) {
      const control = row.querySelector(':scope > a, :scope > button, :scope > [role~="button"]');
      if (control && marked(control) && candidateLabel(control).length >= 4 && ++count >= 2) return true;
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
      const controls = tabs ? [...container.querySelectorAll('[role~="tab" i]')].filter((peer) => peer.closest(collectionSelector) === container && eligible(peer)) : [...container.querySelectorAll(':scope > li, :scope > [role~="listitem" i]')].flatMap((item) => {
        const control = [...item.querySelectorAll(collectionControlSelector)].find((peer) => peer.closest(collectionSelector) === container && eligible(peer));
        return control ? [control] : [];
      });
      let peers = 0;
      let informationPeer = false;
      let facets = 0;
      for (const peer of controls) {
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
      ...container instanceof HTMLElement && container.matches(headingSelector) ? [container] : [],
      ...container.querySelectorAll(headingSelector)
    ].filter((heading) => !heading.closest(`${editableSelector},a,button,[role~="button" i],[role~="tab" i]`) && withinContentBranch(heading, container) && isVisible(heading)).map(getSafeLabel).filter((text) => text.length >= 2 && text.length <= 60);
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
      const outside = [...parent.children].filter((child) => child !== branch);
      if (outside.some((child) => child.matches(contentBoundarySelector) || child.querySelector(contentBoundarySelector) || child.matches(editableSelector) || child.querySelector(editableSelector))) break;
      let summary = cache?.get(parent);
      if (!summary?.wrapperControls) {
        summary = { ...summary, wrapperControls: [...parent.querySelectorAll(collectionControlSelector)] };
        cache?.set(parent, summary);
      }
      if (summary.wrapperControls.some((control) => !branch.contains(control))) break;
      branch = parent;
    }
    return [];
  }
  function cardTitle(element, cache) {
    if (element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby")) return {};
    const fixedTitles = (container) => [...container.querySelectorAll(`${headingSelector},strong,b`)].filter((node) => !node.closest(editableSelector) && withinContentBranch(node, container) && isVisible(node)).filter((node) => !node.parentElement?.closest(`${headingSelector},strong,b`)).map((node) => ({ node, label: clean(staticText(node)) })).filter(({ label }) => isInformationTopicLabel(label));
    const titles = fixedTitles(element);
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
        summary = { ...summary, cardControls: [...parent.querySelectorAll(collectionControlSelector)].filter((control) => !!candidateLabel(control)) };
        cache?.set(parent, summary);
      }
      if (summary.cardControls.length !== 1 || summary.cardControls[0] !== element) break;
      const neighbours = fixedTitles(parent).filter(({ node }) => !element.contains(node) && !!(node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
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
    const references = (control) => (control.getAttribute("aria-controls") ?? "").split(/\s+/).filter(Boolean);
    const contentTarget = (control, id) => {
      const target = document.getElementById(id);
      if (!target || target === control || target.closest(editableSelector) || target.matches('html,body,main,[role~="main" i],a,button,[role~="button" i],[role~="tab" i]') || target.closest('article,aside,form,header,footer,nav,[role~="article" i],[role~="complementary" i],[role~="form" i],[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i]') || target.closest('main,[role~="main" i]') !== control.closest('main,[role~="main" i]')) return;
      return target;
    };
    const controlsTarget = (control) => {
      const ids = references(control);
      return ids.length > 0 && ids.every((id) => !!contentTarget(control, id));
    };
    const expanded = (control) => /^(?:true|false)$/i.test(control.getAttribute("aria-expanded") ?? "");
    const semanticCollection = element.closest(collectionSelector);
    let container = semanticCollection;
    if (!container) {
      container = element.parentElement;
      if (container?.matches('[role~="group" i]') && container.parentElement) container = container.parentElement;
    }
    if (!container || container.matches("body,main,section,article,form,header,footer") || container.childElementCount > 24) return empty;
    let summary = cache?.get(container);
    if (!summary?.topicControls) {
      const controls2 = [...container.querySelectorAll(collectionControlSelector)].filter((control) => !control.closest(collectionExcludedSelector) && !(control instanceof HTMLButtonElement && control.form) && isInformationTopicLabel(candidateLabel(control)) && (semanticCollection ? control.closest(collectionSelector) === container : control.parentElement === container || control.parentElement?.parentElement === container));
      summary = { ...summary, topicControls: controls2 };
      cache?.set(container, summary);
    }
    const controls = summary.topicControls;
    if (controls.length < 2 || controls.length > 12 || !controls.includes(element)) return empty;
    if (!summary.followingHeadings) {
      const headings = followingContentHeadings(container, cache);
      summary = { ...summary, followingHeadings: headings };
      cache?.set(container, summary);
    }
    const associatedHeadings = [...summary.followingHeadings];
    for (const id of references(element)) {
      const target = contentTarget(element, id);
      if (target && target.childElementCount <= 24) {
        for (const label of fixedHeadingLabels(target)) if (!associatedHeadings.includes(label)) associatedHeadings.push(label);
      }
    }
    const controlledTopic = controlsTarget(element) && controls.filter(controlsTarget).length >= 2 || expanded(element) && controls.filter(expanded).length >= 2 || element.matches('[role~="tab" i]') && !!semanticCollection?.matches('[role~="tablist" i]') || !!element.closest('[role~="group" i]') && controls.every((control) => !!control.closest('[role~="group" i]'));
    const linkedTopic = controlsTarget(element) || element.matches('[role~="tab" i]') && !!semanticCollection?.matches('[role~="tablist" i]');
    const localParent = container.parentElement;
    const outsideCollection = localParent?.matches("div") ? [...localParent.children].filter((child) => child !== container) : [];
    const isolatedCollection = !outsideCollection.some((child) => child.matches(`${contentBoundarySelector},${editableSelector},${collectionControlSelector}`) || child.querySelector(`${contentBoundarySelector},${editableSelector},${collectionControlSelector}`));
    const collectionPeers = semanticCollection && isolatedCollection && !container.querySelector(`form,[role~="form" i],${editableSelector}`) ? controls.map((control) => ({ label: candidateLabel(control), ...sourceAction(control, candidateLabel(control)), isLink: control.matches("a[href]") })) : [];
    return { topicPeers: Math.min(controls.length, 2), controlledTopic, linkedTopic, associatedHeadings, collectionPeers };
  }
  function supplementalEvidence(element, cache) {
    const bodyControl = !element.closest('header, footer, article, [role~="banner" i], [role~="contentinfo" i], [role~="article" i]');
    const form = element.closest('form, [role~="form" i]') ?? (element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.form : null);
    const metadataWords = (text) => text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const searchMetadata = (target) => ["id", "class"].some((name) => metadataWords(target.getAttribute(name) ?? "").includes("search")) || /검색|\bsearch\b/i.test(target.getAttribute("aria-label") ?? "");
    const filter = bodyControl && !!form && searchMetadata(form) && searchMetadata(element) && !!element.closest('li, [role~="listitem" i]') && element.matches('a[href], button[type="button"], [role~="button" i]');
    let title;
    let cardRelatedLabel;
    if (bodyControl && !form && !element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby") && element.matches('a, button, [role~="button" i]')) {
      const children = [...element.children];
      const paragraph = children.findIndex((child) => child.matches("p"));
      if (paragraph === 1 && children[0] instanceof HTMLElement && children[0].matches("span, strong, b, em, h2, h3, h4, h5, h6") && isVisible(children[0]) && isVisible(children[1])) {
        const text = clean(staticText(children[0]));
        if (isInformationTopicLabel(text) && clean(staticText(children[1]))) title = text;
      }
      if (!title) ({ title, relatedLabel: cardRelatedLabel } = cardTitle(element, cache));
    }
    let materialRow = false;
    let relatedLabel = cardRelatedLabel;
    const row = bodyControl && !form ? element.closest('tr, [role~="row" i]') : null;
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
        const titleColumn = (text) => /^(?:제목|민원명|사무명|서식명|title|form\s+name)$/i.test(text);
        const attachmentColumn = (text) => /^(?:첨부|서식|첨부파일|attachment|forms?)$/i.test(text);
        const download = (control) => /^(?:자료\s*받기|다운로드|서식\s*받기|download)$/i.test(candidateLabel(control));
        const cells = [...row.querySelectorAll(':scope > td, :scope > th, :scope > [role~="cell" i], :scope > [role~="gridcell" i]')];
        const controls = [...row.querySelectorAll('a[href], button, [role~="button" i]')].filter((control) => control.closest('tr, [role~="row" i]') === row && !!candidateLabel(control));
        const columns = tableSummary.columns;
        const materials = /* @__PURE__ */ new Map();
        if (columns.some(titleColumn) && columns.some(attachmentColumn)) {
          if (cells.length === columns.length) {
            const titles = cells.flatMap((cell, index) => titleColumn(columns[index]) ? controls.filter((control) => control.matches("a[href]") && cell.contains(control)).slice(0, 1) : []);
            const attachments = controls.filter((control) => cells.some((cell, index) => attachmentColumn(columns[index]) && cell.contains(control)) && download(control));
            if (titles.length && attachments.length) {
              const labels = [...new Set(titles.map(candidateLabel))];
              titles.forEach((control) => materials.set(control, candidateLabel(control)));
              attachments.forEach((control) => materials.set(control, labels.length === 1 ? labels[0] : void 0));
            }
          }
        }
        rowSummary = { ...rowSummary, materials };
        cache?.set(row, rowSummary);
      }
      materialRow = rowSummary.materials.has(element);
      relatedLabel = rowSummary.materials.get(element);
    }
    let informationPanels = false;
    if (bodyControl && !form && element.matches('button, [role~="button" i]') && /^(?:true|false)$/i.test(element.getAttribute("aria-expanded") ?? "")) {
      const parent2 = element.parentElement;
      if (!parent2) return {
        filter,
        title,
        materialRow,
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
        const controls = [...parent2.children].filter((child) => child instanceof HTMLElement && child.matches('button, [role~="button" i]') && /^(?:true|false)$/i.test(child.getAttribute("aria-expanded") ?? "") && !(child instanceof HTMLButtonElement && child.form) && isInformationTopicLabel(candidateLabel(child)));
        const panels = controls.length >= 2 && controls.filter((control) => /(?:안내|절차|방법|예시|기준|종류)$/.test(candidateLabel(control))).length >= 2 ? new Set(controls) : /* @__PURE__ */ new Set();
        summary = { ...summary, panels };
        cache?.set(parent2, summary);
      }
      informationPanels = summary.panels.has(element);
    }
    let grouped = false;
    const group = bodyControl && !form ? element.closest('[role~="group" i]') : null;
    const parent = group?.parentElement;
    if (parent) {
      let summary = cache?.get(parent);
      if (!summary?.groups) {
        const controls = [...parent.children].filter((child) => child.matches('[role~="group" i]')).flatMap((child) => {
          const groupControls = [...child.querySelectorAll('a[href], button, [role~="button" i]')].filter((control) => !control.closest('form, [role~="form" i]') && !(control instanceof HTMLButtonElement && control.form) && !!candidateLabel(control));
          return groupControls.length === 1 ? groupControls : [];
        });
        summary = { ...summary, groups: controls.length >= 2 ? new Set(controls) : /* @__PURE__ */ new Set() };
        cache?.set(parent, summary);
      }
      grouped = summary.groups.has(element);
    }
    const topics = bodyControl && !form ? topicEvidence(element, cache) : { topicPeers: 0, controlledTopic: false, linkedTopic: false, associatedHeadings: [], collectionPeers: [] };
    return { filter, title, materialRow, relatedLabel, informationPanels, grouped, ...topics };
  }
  function sourceSnapshot(element, safeLabel = candidateLabel(element), collectionCache, includeCollection = false, includeSupplemental = false, supplementalCache) {
    return {
      pageUrl: location.href,
      baseUrl: document.baseURI,
      attributes: JSON.stringify([
        ...["href", "target", "onclick", "aria-controls", "aria-current", "aria-expanded", "download", "type", "form", "role", "title", "placeholder", "contenteditable"].map((name) => element.getAttribute(name)),
        element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? [element.type, !!element.form] : null,
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
        sourceAction(element, safeLabel)
      ])
    };
  }
  function analyzePage() {
    const commonPurpose = documentPurpose();
    const contextCache = /* @__PURE__ */ new WeakMap();
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
            const destination2 = new URL(raw, document.baseURI);
            if (/^https?:$/.test(destination2.protocol)) {
              destinationHost = destination2.hostname;
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
        snapshot: sourceSnapshot(element, label),
        sectionLabel: labels[0],
        contextLabels: labels,
        pagePurpose: pagePurpose(element, labels, commonPurpose ?? null)
      });
    }
    return candidates;
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
  var normalize = (value) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
  var dangerous = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;
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
  var contactHelp = /^(?:(?:조직(?:도)?\s*(?:및|[·/&])\s*)?(?:(?:담당\s*)?(?:부서|직원|담당자)\s*)?(?:전화번호|연락처)\s*(?:안내|찾기)?|조직도(?:\s*안내)?|(?:staff|department|contact)\s+(?:directory|contacts?))$/i;
  var hoursHelp = /^(?:(?:이용|운영|개관|업무)\s*시간(?:\s*안내)?|휴관일(?:\s*안내)?|(?:opening|business|service)\s+hours)$/i;
  var formTitle = /(?:신청서|신고서|위임장|동의서|청구서|\b(?:application|declaration|authorization|consent|claim)\s+form)$/i;
  var formDownload = /(?:(?:신청서|신고서|위임장|동의서|청구서)\s*(?:다운로드|다운\s*받기)|\bdownload\s+(?:application|declaration|authorization|consent|claim)\s+form)$/i;
  var formsHeading = /^(?:(?:민원|신청)?\s*서식(?:\s*(?:자료|목록|안내))?|forms?(?:\s+(?:library|downloads?))?)$/i;
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
  var applicationControlLabel = /^(?=.{2,36}$)[^.!?。？]{0,28}(?:신청|예약|접수)(?:\s*(?:하기|하러\s*가기|바로\s*가기))?$|^(?:apply(?:\s+now)?|reservations?|booking)$/i;
  var issuanceServiceHeading = /^(?=.{2,48}$)(?:(?:온라인|인터넷|전자)\s*)?(?:(?:증명(?:서)?|민원|서류)\s*)?발급\s*(?:시스템|서비스)(?:\s*(?:바로\s*가기|목록))?$/;
  function hasDangerousScript(element) {
    const raw = element.getAttribute("href")?.trim() ?? "";
    const script = [element.getAttribute("onclick") ?? "", /^javascript:/i.test(raw) ? raw : ""].join(" ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
    return dangerous.test(script);
  }
  function contextsFor(candidate, label) {
    return [candidate.sectionLabel, ...candidate.contextLabels ?? []].filter((value) => !!value).map(normalize).filter((value) => value !== label);
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
    return !!url && candidate.action === "navigate" && candidate.element.matches("a[href]") && candidate.context !== "footer" && !candidate.element.closest('article, [role~="article"]') && /납부\s*(?:안내|방법|절차|일정)$/.test(label) && !dangerous.test(label.replace(/납부/g, "")) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(target)) && hasAcademicContext(candidate, label);
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
    if (!document2 && !download) return;
    if (rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return "conflict";
    return document2 ? "document" : "download";
  }
  function pathParts(url) {
    return url.pathname.split("/").filter(Boolean).map((part) => {
      try {
        return normalize(decodeURIComponent(part)).toLowerCase();
      } catch {
        return part.toLowerCase();
      }
    });
  }
  function isDangerousURL(url, parts) {
    if (parts.some((part) => dangerous.test(part.replace(/[_.-]/g, " ")))) return true;
    for (const key of url.searchParams.keys()) {
      const folded = key.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
      if (riskyFlagKeys.has(folded)) return true;
      if (actionKeys.includes(folded) && url.searchParams.getAll(key).some((value) => {
        const command = normalize(value);
        return dangerous.test(command) || /^(?:submit|final[\s_-]*submit|submit[\s_-]*final)$/i.test(command);
      })) return true;
    }
    return false;
  }
  function endpoint(parts) {
    const names = parts.map((part) => part.replace(/\.(?:html?|php|aspx?|jsp|do)$/i, ""));
    const last = names.at(-1) ?? "";
    return /^(?:index|list|main)$/.test(last) ? names.at(-2) ?? "" : last;
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
    if (!listedLink || ![section, ...candidate.contextLabels ?? []].some((value) => notice.section.test(normalize(value)) || noticeListHeading.test(normalize(value)))) return;
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
  function structuredContext(candidate, label, collection, url) {
    const element = candidate.element;
    if (!collection.kind || candidate.context === "footer" || !isInformationTopicLabel(label) || isDocumentDownload(element, candidate.label) || element.closest('header, footer, article, form, [role~="banner" i], [role~="contentinfo" i], [role~="article" i], [role~="form" i]') || (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && !!element.form) return;
    let destination2 = url;
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (!destination2 && raw && !/^(?:#|javascript:)/i.test(raw)) {
      try {
        const parsed = new URL(raw, document.baseURI);
        if (/^https?:$/.test(parsed.protocol)) destination2 = parsed;
        else return;
      } catch {
        return;
      }
    }
    if (hasDangerousScript(element)) return;
    const parts = destination2 ? pathParts(destination2) : [];
    if (destination2 && (isDangerousURL(destination2, parts) || hasDocumentReference(destination2)) || parts.some((part) => /^(?:news|articles?|stories|story|press)$/.test(part))) return;
    const target = endpoint(parts);
    const contexts = contextsFor(candidate, label);
    if (contexts.some((heading) => issuanceServiceHeading.test(heading)) && collection.kind === "list" && (collection.controlled || !!destination2) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) {
      return { ...candidate, category: "apply", score: 70, reasons: ["\uBC1C\uAE09 \uC11C\uBE44\uC2A4 \uC9C4\uC785", "\uBA85\uC2DC\uC801 \uBC1C\uAE09 \uC2DC\uC2A4\uD15C \uC81C\uBAA9\uACFC \uC6D0\uBCF8 \uBAA9\uB85D \uC81C\uC5B4"], pageTask: "control" };
    }
    const localReading = !!destination2 && destination2.origin === location.origin && candidate.action === "navigate";
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
    const contexts = [candidate.sectionLabel, ...candidate.contextLabels ?? []].filter((value) => !!value).map(normalize);
    const helpContext = candidate.pagePurpose === "help" || contexts.some((value) => rules.find((rule) => rule.category === "help").section.test(value)) || isQuestionCollection(candidate.element);
    const term = candidate.element.closest("dt");
    const definitionQuestion = !!term?.closest("dl") && isVisible(term) && isVisible(candidate.element) && [candidate.element, term].some((element) => answerToggle.test(normalize(element.getAttribute("title") ?? "")));
    if (definitionQuestion && label.length >= 4 && candidate.element.matches('a, button, [role~="button"]')) {
      return { category: "help", score: 72, reasons: ["\uB3C4\uC6C0\uB9D0 \uC9C8\uBB38 \uC77D\uAE30", "\uC815\uC758 \uBAA9\uB85D\uACFC \uBA85\uC2DC\uC801 \uB2F5\uBCC0 \uC5F4\uAE30 \uD45C\uC2DC"], pageTask: "reading" };
    }
    if (helpContext) {
      const questionMarker = [...candidate.element.querySelectorAll(":scope > abbr[title]")].some((marker) => marker instanceof HTMLElement && isVisible(marker) && /^(?:질문|question)$/i.test(normalize(marker.getAttribute("title") ?? "")));
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
  function supplementalClassification(candidate, label, target, supplementalCache, url) {
    const element = candidate.element;
    if (candidate.context !== "body" || !element.matches('a[href], button, [role~="button" i]') || element.closest('article, [role~="article" i]')) return;
    const evidence = supplementalEvidence(element, supplementalCache);
    const raw = element.getAttribute("href")?.trim() ?? "";
    if (hasDangerousScript(element)) return;
    let destination2 = url;
    if (!destination2 && raw && !/^(?:#|javascript:)/i.test(raw)) {
      try {
        destination2 = new URL(raw, document.baseURI);
      } catch {
        return;
      }
      if (!/^https?:$/.test(destination2.protocol)) return;
    }
    if (destination2 && isDangerousURL(destination2, pathParts(destination2))) return;
    if (destination2 && pathParts(destination2).some((part) => /^(?:news|articles?|stories|story|press)$/.test(part))) return;
    if (destination2) target = endpoint(pathParts(destination2));
    const result = (category, score, reason, task) => ({
      ...candidate,
      category,
      score,
      reasons: [reason, "\uACE0\uC815 \uC6D0\uBCF8 \uC81C\uC5B4 \uAD6C\uC870"],
      pageTask: task,
      supplementalDependent: true,
      relatedLabel: evidence.relatedLabel,
      snapshot: sourceSnapshot(element, candidate.label, void 0, false, true, supplementalCache)
    });
    if (!dangerous.test(label) && evidence.filter && isInformationTopicLabel(label) && !rules.some((rule) => rule.category !== "search" && rule.endpoints.has(target))) return result("search", 70, "\uAC80\uC0C9 \uC591\uC2DD\uC758 \uBD84\uC57C \uD544\uD130", "control");
    const contexts = contextsFor(candidate, label);
    if (!dangerous.test(label) && evidence.materialRow && label.length >= 2 && label.length <= 60 && !rules.some((rule) => !["apply", "academic"].includes(rule.category) && rule.label.test(label)) && contexts.some((text) => /^(?=.{2,40}$).*(?:민원|신청|신고).*(?:편람|서식|준비\s*자료)$/.test(text)) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return result("apply", 70, "\uC2E0\uCCAD \uC900\uBE44 \uD3B8\uB78C\uC758 \uC6D0\uBCF8 \uC11C\uC2DD \uC790\uB8CC", "reading");
    if (contextualReading(candidate, label)?.category === "academic" || issuanceIntent.test(label) && contexts.some((text) => procedureHeading.test(text))) return;
    const guideContext = contexts.some((text) => text.length <= 60 && /안내$/.test(text));
    const readingContexts = [...contexts, ...evidence.associatedHeadings];
    const guideReading = candidate.pagePurpose === "help" || readingContexts.some((text) => text.length <= 60 && (/(?:안내|설명서|도움말|사용\s*법|이용\s*법|가이드|요령|수칙|매뉴얼|\b(?:instructions?|guide|manual|help))$/i.test(text) || /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|download)$/i.test(text)));
    const academicPeer = (peer) => {
      if (!peer.isLink || peer.action !== "navigate" || !peer.href || !isInformationTopicLabel(peer.label) || !academicConcept.test(peer.label) || !academicGuideEnd.test(peer.label) || dangerous.test(peer.label)) return false;
      try {
        const destination3 = new URL(peer.href);
        const peerParts = pathParts(destination3);
        return /^https?:$/.test(destination3.protocol) && destination3.origin === location.origin && !isDangerousURL(destination3, peerParts) && !hasDocumentReference(destination3) && !peerParts.some((part) => /^(?:news|articles?|stories|story|press)$/.test(part)) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(endpoint(peerParts)));
      } catch {
        return false;
      }
    };
    const educationPeers = evidence.collectionPeers.filter(academicPeer);
    if (candidate.action === "navigate" && academicPeer({ label: candidate.label, action: candidate.action, href: candidate.href, isLink: element.matches("a[href]") }) && educationPeers.length >= 2 && educationPeers.length > evidence.collectionPeers.length / 2) {
      return candidate.pagePurpose === "help" ? result("help", 70, "\uBA85\uC2DC\uC801 \uB3C4\uC6C0\uB9D0 \uBAA9\uC801\uACFC \uC6D0\uBCF8 \uAD50\uC721 \uAC1C\uB150 \uBAA9\uB85D", "reading") : result("academic", 70, "\uAC19\uC740 \uCD9C\uCC98 \uC77D\uAE30 \uB9C1\uD06C\uC640 \uB2E4\uC218\uC758 \uACE0\uC815 \uAD50\uC721 \uAC1C\uB150", "reading");
    }
    const readingTopic = evidence.topicPeers >= 2 && (evidence.controlledTopic || evidence.associatedHeadings.length > 0) && !(destination2 && hasDocumentReference(destination2));
    const competingTask = rules.some((rule) => rule.category !== "help" && rule.label.test(label) && !(rule.category === "search" && searchGuidanceLabel.test(label)));
    const readingSubject = evidence.linkedTopic || /(?:결과|기능|조건|절차|방법|안내|단계|항목|구성|개요)$/.test(label);
    const academicTopic = !dangerous.test(label) && readingTopic && academicConcept.test(label) && !explicitApplication.test(label) && readingContexts.some((text) => text.length <= 60 && /학사|학적|교육\s*과정|학위|이수|전공|교양|졸업/.test(text)) && !rules.some((rule) => rule.category !== "academic" && rule.endpoints.has(target));
    if (academicTopic && candidate.pagePurpose !== "help") return result("academic", 70, "\uC6D0\uBCF8 \uAD50\uC721 \uAC1C\uB150\uACFC \uC5F0\uACB0\uB41C \uB0B4\uC6A9 \uC81C\uBAA9", "reading");
    if (!dangerous.test(label) && readingTopic && isInformationTopicLabel(label) && !isSearchControl(element, candidate.label) && !element.closest('form, [role~="form" i]') && !isDocumentDownload(element, candidate.label) && (!competingTask || readingSubject) && !rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target)) && guideReading) {
      return result("help", 70, "\uC6D0\uBCF8 \uC548\uB0B4 \uC8FC\uC81C\uC640 \uC5F0\uACB0\uB41C \uC77D\uAE30 \uC81C\uC5B4", "reading");
    }
    if (academicTopic) {
      return result("academic", 70, "\uC6D0\uBCF8 \uAD50\uC721 \uAC1C\uB150\uACFC \uC5F0\uACB0\uB41C \uB0B4\uC6A9 \uC81C\uBAA9", "reading");
    }
    if (!dangerous.test(label) && guideReading && candidate.action === "locate" && label.length <= 60 && element.matches('button, [role~="button" i]') && !element.closest('form, [role~="form" i]') && /(?:안내서|설명서|매뉴얼|가이드|\b(?:guide|manual))\s*(?:다운로드|내려\s*받기|받기|download)$/i.test(label)) {
      return result("help", 70, "\uC548\uB0B4 \uBB38\uB9E5\uC758 \uBA85\uC2DC\uC801 \uAC00\uC774\uB4DC \uC790\uB8CC \uC81C\uC5B4", "reading");
    }
    if (!dangerous.test(label) && isInformationTopicLabel(label) && candidate.action === "locate" && (evidence.informationPanels || guideContext && evidence.grouped) && !rules.some((rule) => rule.category !== "help" && rule.label.test(label) && !(rule.category === "search" && searchGuidanceLabel.test(label))) && !isDocumentDownload(element, candidate.label) && !rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target))) return result("help", 65, "\uACF5\uAC1C \uC815\uBCF4 \uD328\uB110\xB7\uC548\uB0B4 \uC8FC\uC81C \uC77D\uAE30", "reading");
    const title = evidence.title;
    if (!title || dangerous.test(title.replace(/납부(?=\s*(?:내역|기록))/, "")) || isDocumentDownload(element, candidate.label) || destination2 && hasDocumentReference(destination2) || element.closest('form, [role~="form" i]')) return;
    if (/^(?=.{2,36}$).*(?:모의\s*계산|간단\s*계산|simulation|calculator)$/i.test(title) && !dangerous.test(label) && !rules.some((rule) => rule.category !== "search" && rule.endpoints.has(target))) return result("search", 70, "\uBA85\uC2DC\uC801 \uBAA8\uC758\xB7\uAC04\uB2E8 \uACC4\uC0B0 \uCE74\uB4DC", "control");
    if (/^(?=.{2,36}$).*(?:내역|기록)\s*(?:조회|확인)(?:하기)?$/.test(title) && !dangerous.test(label.replace(/납부(?=\s*(?:내역|기록))/g, "")) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return result("apply", 70, "\uAC1C\uC778 \uB0B4\uC5ED\xB7\uAE30\uB85D \uD655\uC778 \uCE74\uB4DC", "control");
    if (!dangerous.test(label) && (applicationControlLabel.test(title) || explicitApplication.test(title) || /^(?=.{2,36}$).*(?:급여|급부|지원금)\s*청구$/.test(title)) && !rules.some((rule) => rule.category !== "apply" && rule.endpoints.has(target))) return result("apply", 70, "\uBA85\uC2DC\uC801 \uC2E0\uCCAD\xB7\uCCAD\uAD6C \uCE74\uB4DC \uC81C\uBAA9", "control");
  }
  function readonlyHelpDocument(candidate, label, target, url) {
    if (!url || candidate.context !== "body" || candidate.action !== "navigate" || !candidate.element.matches("a[href]") || !candidate.element.closest('li, tr, [role~="listitem"], [role~="row"]') || candidate.element.closest('article, [role~="article"]') || !hasDocumentReference(url) || candidate.pagePurpose !== "help" || label.length < 4 || label.length > 100 || pathParts(url).some((part) => /^(?:news|articles?|stories|story|press)$/.test(part)) || !(/(?:안내|방법|절차)$/.test(label) || interrogative.test(label)) || rules.some((rule) => rule.category !== "help" && rule.endpoints.has(target))) return;
    return { ...candidate, category: "help", score: 72, reasons: ["\uB3C4\uC6C0\uB9D0 \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uB3C4\uC6C0\uB9D0 \uBAA9\uC801\uACFC \uBAA9\uB85D\uC758 \uBA85\uC2DC\uC801 \uC77D\uAE30 \uBB38\uC11C"], pageTask: "reading" };
  }
  function classify(candidates) {
    const collectionCache = /* @__PURE__ */ new WeakMap();
    const supplementalCache = /* @__PURE__ */ new WeakMap();
    return candidates.flatMap((candidate) => {
      const sourceLabel = normalize(candidate.label).replace(/[_-]+/g, " ");
      const documentDownload = candidate.action === "locate" && isDocumentDownload(candidate.element, candidate.label);
      const label = documentDownload ? sourceLabel.replace(documentExtension, "").trim() : sourceLabel;
      if (orderingLabel.test(label)) return [];
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
      if (!url) {
        const raw = candidate.element.getAttribute("href")?.trim() ?? "";
        if (raw && !/^(?:#|javascript:)/i.test(raw)) {
          try {
            const sourceURL = new URL(raw, document.baseURI);
            if (/^https?:$/.test(sourceURL.protocol) && isDangerousURL(sourceURL, pathParts(sourceURL))) return [];
          } catch {
          }
        }
      }
      const target = endpoint(parts);
      const academicInfo = academicInformation(candidate, label, target, url);
      const readonlyHelp = readonlyHelpDocument(candidate, label, target, url);
      if (readonlyHelp) return [readonlyHelp];
      const supplemental = supplementalClassification(candidate, label, target, supplementalCache, url);
      if (supplemental) return [supplemental];
      if (dangerous.test(label) && !academicInfo) return [];
      const searchControl = isSearchControl(candidate.element, label);
      const searchGuidance = !searchControl && searchGuidanceLabel.test(label);
      const inquiry = label.split(/[\s\p{P}\p{S}]+/u).some((word) => inquiryWord.test(word));
      const section = normalize(candidate.sectionLabel ?? "");
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
      const form = formReading(candidate, label, target, url);
      if (form === "conflict") return [];
      if (form) return [{ ...candidate, category: "apply", score: 70, reasons: ["\uC2E0\uCCAD \uC900\uBE44 \uBB38\uC11C \uC77D\uAE30", form === "document" ? "\uC11C\uC2DD \uBAA9\uB85D\uACFC \uBA85\uC2DC\uC801 \uBB38\uC11C\uBA85" : "\uBC1C\uAE09\xB7\uC2E0\uCCAD \uC808\uCC28\uC758 \uBA85\uC2DC\uC801 \uC11C\uC2DD \uB2E4\uC6B4\uB85C\uB4DC"], pageTask: "reading" }];
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
        const textMatch = (rule.label.test(label) || rule.category === "help" && (inquiry || contactHelp.test(label) || hoursHelp.test(label) || branchDirectory.test(label)) || rule.category === "apply" && issuanceIntent.test(label) || rule.category === "notice" && publicNoticeList.test(label)) && !(rule.category === "search" && searchGuidance);
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
          const pageTask = candidate.context === "body" ? semanticMatch || rule.category === "apply" && applicationPageControl(candidate, label, target, url) || rule.category === "help" && (viewerControl.test(label) || candidate.element.matches('a[href], button, [role~="button"]') && (contactHelp.test(label) || hoursHelp.test(label) || branchDirectory.test(label) || counselingControl.test(label))) ? "control" : sectionMatch || rule.category === "notice" && noticeCollection.test(label) ? "collection" : void 0 : void 0;
          best = { ...candidate, category: rule.category, score, reasons, pageTask };
          bestIntent = intent;
        }
      }
      if (!best) {
        const structured = structuredContext(candidate, label, collectionEvidence(candidate.element, collectionCache), url);
        if (structured) return [{
          ...structured,
          collectionDependent: true,
          snapshot: sourceSnapshot(candidate.element, candidate.label, collectionCache, true)
        }];
      }
      if ((!best || best.category === "academic") && (academicReading(candidate, label, target, url) || academicLocalDestination(candidate, label, target, url))) {
        return [{ ...candidate, category: "academic", score: 70, reasons: ["\uD559\uC0AC \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uD559\uC0AC \uC81C\uBAA9\uACFC \uBAA9\uB85D\uC758 \uAD50\uC721 \uAC1C\uB150\xB7\uC9C0\uCE68"], pageTask: "reading" }];
      }
      const guideContext = contextsFor(candidate, label).some((value) => value.length <= 60 && /안내$/.test(value));
      const formSubmit = candidate.element instanceof HTMLButtonElement && !!candidate.element.form && candidate.element.type === "submit";
      if (!best && guideContext && isInformationTopicLabel(label) && candidate.context !== "footer" && candidate.action === "locate" && !formSubmit && candidate.element.matches('button, [role~="button"]') && /^(?:true|false)$/i.test(candidate.element.getAttribute("aria-expanded") ?? "") && !candidate.element.closest('article, [role~="article"]')) {
        return [{ ...candidate, category: "help", score: 60, reasons: ["\uC548\uB0B4 \uC815\uBCF4 \uD328\uB110 \uC77D\uAE30", "\uC548\uB0B4 \uC81C\uBAA9\uACFC \uBA85\uC2DC\uC801 \uD3BC\uCE68 \uC81C\uC5B4"], pageTask: "control" }];
      }
      if (!best && url && candidate.action === "navigate" && candidate.element.matches("a[href]") && candidate.context !== "footer" && label.length >= 4 && label.length <= 36 && /안내(?:\s*바로\s*가기)?$/.test(label) && !knownEndpoint && !hasDocumentReference(url) && !/^\d+(?:\.[a-z]+)?$/i.test(parts.at(-1) ?? "") && !candidate.element.closest('article, [role~="article"]')) {
        return [{ ...candidate, category: "help", score: 60, reasons: ["\uACF5\uAC1C \uC548\uB0B4 \uBB38\uC11C \uC77D\uAE30", "\uC9E7\uC740 \uC548\uB0B4 \uBAA9\uC801\uC758 \uC77C\uBC18 \uB9C1\uD06C"], pageTask: void 0 }];
      }
      return best && best.score >= 55 ? [best] : [];
    });
  }

  // src/ranker.ts
  var MAX_CARDS = 6;
  var MAX_PER_CATEGORY = 3;
  var MAX_PAGE_TASKS = 3;
  var contextOrder = { primary: 0, body: 1, footer: 2 };
  var compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  var normalizedLabel = (candidate) => candidate.label.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
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
  function sourceOrder(a, b) {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
  }
  function compare(a, b) {
    return pagePriority(b) - pagePriority(a) || navigationPriority(b) - navigationPriority(a) || b.score - a.score || contextOrder[a.context] - contextOrder[b.context] || a.label.length - b.label.length || compareText(normalizedLabel(a), normalizedLabel(b)) || compareText(destination(a), destination(b)) || compareText(a.category ?? "", b.category ?? "") || compareText(a.action, b.action) || compareText(a.element.id, b.element.id);
  }
  function ordered(candidates) {
    const sorted = [...candidates].sort(compare);
    const groups = /* @__PURE__ */ new Map();
    sorted.forEach((candidate, index) => {
      if (candidate.pageTask !== "reading") return;
      const container = candidate.element.closest('ul, ol, table, [role~="list"], [role~="grid"]');
      if (!container) return;
      const key = `${candidate.category}:${candidate.score}:${pagePriority(candidate)}`;
      const peers = groups.get(container) ?? /* @__PURE__ */ new Map();
      peers.set(key, [...peers.get(key) ?? [], index]);
      groups.set(container, peers);
    });
    for (const peers of groups.values()) for (const positions of peers.values()) {
      const readings = positions.map((index) => sorted[index]).sort(sourceOrder);
      positions.forEach((index, offset) => {
        sorted[index] = readings[offset];
      });
    }
    return sorted;
  }
  function rank(candidates) {
    const destinations = /* @__PURE__ */ new Set();
    const controls = /* @__PURE__ */ new Set();
    const unique = ordered(candidates.filter((candidate) => candidate.category)).filter((candidate) => {
      const href = destination(candidate);
      if (href) {
        if (destinations.has(href)) return false;
        destinations.add(href);
      } else {
        if (controls.has(candidate.element)) return false;
        controls.add(candidate.element);
      }
      return true;
    });
    const counts = /* @__PURE__ */ new Map();
    const selected = [];
    for (const candidate of unique) {
      if (!candidate.category || !isPageTask(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
      counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
      selected.push(candidate);
      if (selected.length === MAX_PAGE_TASKS) break;
    }
    for (const candidate of unique) {
      if (!candidate.category || counts.has(candidate.category)) continue;
      counts.set(candidate.category, 1);
      selected.push(candidate);
      if (selected.length === MAX_CARDS) return ordered(selected);
    }
    for (const candidate of unique) {
      if (!candidate.category || selected.includes(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
      counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
      selected.push(candidate);
      if (selected.length === MAX_CARDS) break;
    }
    if (selected.length < MAX_CARDS) for (const candidate of unique) {
      if (selected.includes(candidate)) continue;
      selected.push(candidate);
      if (selected.length === MAX_CARDS) break;
    }
    return ordered(selected);
  }
  function alreadyShown(selected) {
    const destinations = /* @__PURE__ */ new Set();
    const controls = /* @__PURE__ */ new Set();
    for (const candidate of selected) {
      const href = destination(candidate);
      if (href) destinations.add(href);
      else controls.add(candidate.element);
    }
    return { destinations, controls };
  }
  function hasMoreMenus(candidates, selected) {
    const shown = alreadyShown(selected);
    return candidates.some((candidate) => {
      if (!candidate.category) return false;
      const href = destination(candidate);
      return href ? !shown.destinations.has(href) : !shown.controls.has(candidate.element);
    });
  }
  function* remainingMenus(candidates, selected) {
    const shown = alreadyShown(selected);
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

  // src/page-session.ts
  function isCandidateCurrent(candidate, collectionCache, supplementalCache, contextCache, commonPurpose) {
    const label = candidateLabel(candidate.element);
    if (label !== candidate.label) return false;
    if (sourceContext(candidate.element) !== candidate.context) return false;
    const labels = contextLabels(candidate.element, contextCache);
    if (labels[0] !== candidate.sectionLabel || JSON.stringify(labels) !== JSON.stringify(candidate.contextLabels ?? [])) return false;
    if (pagePurpose(candidate.element, labels, commonPurpose) !== candidate.pagePurpose) return false;
    const current = sourceSnapshot(candidate.element, label, collectionCache, !!candidate.collectionDependent, !!candidate.supplementalDependent, supplementalCache);
    return !!candidate.snapshot && current.pageUrl === candidate.snapshot.pageUrl && current.baseUrl === candidate.snapshot.baseUrl && current.attributes === candidate.snapshot.attributes;
  }
  function areCandidatesCurrent(candidates) {
    const collectionCache = /* @__PURE__ */ new WeakMap();
    const supplementalCache = /* @__PURE__ */ new WeakMap();
    const contextCache = /* @__PURE__ */ new WeakMap();
    const commonPurpose = documentPurpose() ?? null;
    return candidates.every((candidate) => isCandidateCurrent(candidate, collectionCache, supplementalCache, contextCache, commonPurpose));
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
      attributeFilter: ["href", "target", "onclick", "aria-controls", "aria-current", "aria-expanded", "download", "type", "form", "id", "role", "disabled", "aria-disabled", "aria-hidden", "hidden", "class", "style", "aria-label", "aria-labelledby", "title", "placeholder", "contenteditable"]
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
    const text = document.createElement("p");
    text.id = "easyweb-original-message";
    text.textContent = result.ok ? `\uC6D0\uBCF8\uC758 \u2018${label}\u2019 \uBA54\uB274\uB97C \uD45C\uC2DC\uD588\uC5B4\uC694. \uC9C1\uC811 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.` : result.reason === "changed" ? "\uC6D0\uBCF8 \uBA54\uB274\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694. EasyWeb\uC744 \uB2E4\uC2DC \uC5F4\uC5B4 \uCC3E\uC544\uC8FC\uC138\uC694." : result.reason === "covered" ? "\uC6D0\uBCF8 \uBA54\uB274\uAC00 \uB2E4\uB978 \uCC3D\uC5D0 \uAC00\uB824\uC838 \uC788\uC5B4\uC694. \uC0AC\uC774\uD2B8\uC758 \uD31D\uC5C5\uC744 \uB2EB\uACE0 \uB2E4\uC2DC \uCC3E\uC544\uC8FC\uC138\uC694." : result.reason === "unavailable" ? "\uC6D0\uBCF8 \uBA54\uB274\uAC00 \uBC14\uB00C\uC5C8\uAC70\uB098 \uC0AC\uB77C\uC84C\uC5B4\uC694. \uB2E4\uC2DC EasyWeb\uC744 \uC5F4\uC5B4 \uCC3E\uC544\uC8FC\uC138\uC694." : "\uC6D0\uBCF8 \uBA54\uB274\uB97C \uD654\uBA74\uC5D0\uC11C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC6D0\uBCF8 \uD654\uBA74\uC5D0\uC11C \uBA54\uB274\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "\uC548\uB0B4 \uB2EB\uAE30";
    dismiss.setAttribute("aria-describedby", text.id);
    const style = document.createElement("style");
    const sourceInLowerHalf = source.isConnected && source.getBoundingClientRect().top > window.innerHeight / 2;
    style.textContent = `:host{all:initial}div{position:fixed;${sourceInLowerHalf ? "top" : "bottom"}:16px;right:16px;z-index:2147483647;box-sizing:border-box;width:min(480px,calc(100vw - 32px));max-height:40vh;overflow:auto;padding:16px;background:#fff;color:#172739;border:2px solid #08796e;border-radius:12px;box-shadow:0 4px 20px #17273925;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif}p{margin:0 0 8px;overflow-wrap:anywhere}button{min-height:48px;min-width:48px;padding:8px 16px;background:#fff;color:#172739;border:1px solid #526476;border-radius:8px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #08796e;outline-offset:3px}@media(forced-colors:active){div,button{background:Canvas;color:CanvasText;border-color:CanvasText}button:focus-visible{outline-color:Highlight}}`;
    panel.append(text, dismiss);
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
    refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6"/>'
  };
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths[name] ?? paths.help;
    return svg;
  }
  function el(tag, className = "", text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== void 0) element.textContent = text;
    return element;
  }
  function openEasyMode(host) {
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
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && shadow.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && shadow.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    const topbar = el("div", "topbar");
    const topInner = el("div", "top-inner");
    const brand = el("div", "brand");
    const mark = el("span", "brand-mark");
    mark.append(icon("brand"));
    const name = el("div", "", "EasyWeb");
    name.append(el("small", "", "\uBCF5\uC7A1\uD55C \uD654\uBA74\uC744 \uB354 \uC27D\uAC8C"));
    brand.append(mark, name);
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
    const label = el("div", "section-label");
    const sectionTitle = el("h2", "", "\uBC14\uB85C \uC774\uC6A9\uD558\uAE30");
    sectionTitle.id = "easyweb-actions";
    const refresh = el("button", "refresh");
    refresh.type = "button";
    refresh.append(icon("refresh"), document.createTextNode("\uB2E4\uC2DC \uCC3E\uAE30"));
    label.append(sectionTitle, refresh);
    const grid = el("section", "grid");
    grid.setAttribute("aria-labelledby", sectionTitle.id);
    const pagesNavigation = el("nav", "menu-pages");
    pagesNavigation.setAttribute("aria-label", "\uB2E4\uB978 \uAE30\uB2A5 \uCC3E\uC544\uBCF4\uAE30");
    const previous = el("button", "menu-page", "\uC774\uC804 \uBA54\uB274");
    previous.type = "button";
    const next = el("button", "menu-page", "\uB2E4\uB978 \uBA54\uB274 \uBCF4\uAE30");
    next.type = "button";
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
    shell.append(site, intro, changeNotice, label, grid, pagesNavigation, hint, bottom);
    dialog.append(topbar, shell);
    let items = [];
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
    }
    function markStale() {
      if (stale || closed) return;
      stale = true;
      changeNotice.textContent = "\uC6D0\uBCF8 \uD398\uC774\uC9C0\uAC00 \uBC14\uB00C\uC5C8\uC5B4\uC694. \uB2E4\uC2DC \uCC3E\uAE30\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694.";
      changeNotice.hidden = false;
      for (const item of grid.querySelectorAll(".card")) {
        item.setAttribute("aria-disabled", "true");
        if (item instanceof HTMLAnchorElement) {
          item.removeAttribute("href");
          item.setAttribute("role", "link");
          item.tabIndex = 0;
        }
      }
      const pagingHadFocus = shadow.activeElement === previous || shadow.activeElement === next;
      updatePageControls();
      if (pagingHadFocus) refresh.focus({ preventScroll: true });
    }
    function card(candidate) {
      const info = CATEGORY_INFO[candidate.category];
      const item = candidate.action === "navigate" ? el("a", "card") : el("button", "card");
      item.dataset.category = candidate.category;
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
      const image = el("span", "card-icon");
      image.append(icon(info.icon));
      const action = el("span", "card-action", candidate.action === "navigate" ? candidate.target === "_blank" ? "\uC6D0\uBCF8 \uD398\uC774\uC9C0 \uC0C8 \uCC3D\uC73C\uB85C \uC774\uB3D9" : "\uC6D0\uBCF8 \uD398\uC774\uC9C0\uB85C \uC774\uB3D9" : "\uC6D0\uBCF8\uC5D0\uC11C \uACC4\uC18D\uD558\uAE30");
      action.append(icon(candidate.action === "navigate" ? "external" : "arrow"));
      const cardTitle2 = items.filter((other) => other.category === candidate.category).length > 1 ? candidate.label : info.title;
      const titleNode = el("span", "card-title", cardTitle2);
      const sourceNode = el("span", "card-source", `\uCC3E\uC740 \uBA54\uB274 \xB7 ${candidate.label}`);
      item.append(image, titleNode, el("span", "card-description", info.description), sourceNode);
      if (candidate.relatedLabel && candidate.relatedLabel !== candidate.label) {
        item.append(el("span", "card-context card-source", `\uAD00\uB828 \uD56D\uBAA9 \xB7 ${candidate.relatedLabel}`));
      }
      if (candidate.destinationHost && candidate.destinationHost !== location.hostname) {
        const destination2 = el("span", "card-source", `\uC5F0\uACB0\uB41C \uC0AC\uC774\uD2B8 \xB7 ${candidate.destinationHost}`);
        item.append(destination2);
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
      status.textContent = `${announce ? "\uB2E4\uC2DC \uD655\uC778\uD588\uC5B4\uC694. " : ""}\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0\uC11C ${items.length}\uAC1C\uC758 \uC8FC\uC694 \uAE30\uB2A5\uC744 \uCC3E\uC558\uC5B4\uC694.${pageIndex ? ` ${pageIndex + 1}\uBC88\uC9F8 \uBA54\uB274 \uD654\uBA74\uC774\uC5D0\uC694.` : ""}${pageIndex < pages.length - 1 || hasRemaining ? " \uB2E4\uB978 \uBA54\uB274\uB3C4 \uBCFC \uC218 \uC788\uC5B4\uC694." : ""}`;
    }
    function update(announce = false) {
      const candidates = classify(analyzePage());
      const initial = rank(candidates);
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
    refresh.addEventListener("click", () => update(true));
    update();
    dialog.showModal();
    closeButton.focus();
    stopWatching = watchCandidates(() => stale ? [] : items, markStale);
    return close;
  }

  // src/content.ts
  (() => {
    clearOriginalNotice();
    const existing = document.querySelector("[data-easyweb-host]");
    if (existing) {
      existing.dispatchEvent(new Event("easyweb:close"));
      return;
    }
    const host = document.createElement("div");
    host.dataset.easywebHost = "true";
    document.body.append(host);
    try {
      const close = openEasyMode(host);
      host.addEventListener("easyweb:close", close, { once: true });
    } catch (error) {
      host.remove();
      console.error("EasyWeb \uD654\uBA74\uC744 \uC5F4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.", error);
    }
  })();
})();
//# sourceMappingURL=content.js.map
