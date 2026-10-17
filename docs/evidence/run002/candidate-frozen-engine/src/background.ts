chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'EasyWeb 쉬운 화면 열기 / 닫기' });
  } catch {
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#a33c29' });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: '이 페이지에서는 EasyWeb을 실행할 수 없습니다. 일반 웹사이트에서 다시 실행해주세요.',
    });
  }
});
