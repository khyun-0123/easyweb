"use strict";
(() => {
  // src/background.ts
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
      await chrome.action.setTitle({ tabId: tab.id, title: "EasyWeb \uC26C\uC6B4 \uD654\uBA74 \uC5F4\uAE30 / \uB2EB\uAE30" });
    } catch {
      await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
      await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#a33c29" });
      await chrome.action.setTitle({
        tabId: tab.id,
        title: "\uC774 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 EasyWeb\uC744 \uC2E4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC77C\uBC18 \uC6F9\uC0AC\uC774\uD2B8\uC5D0\uC11C \uB2E4\uC2DC \uC2E4\uD589\uD574\uC8FC\uC138\uC694."
      });
    }
  });
})();
//# sourceMappingURL=background.js.map
