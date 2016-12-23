chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // wait for document to load
    if (changeInfo.status == 'complete') {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
            chrome.tabs.sendMessage(tab.id, { url: tab.url }, null);
        });
    }
});
