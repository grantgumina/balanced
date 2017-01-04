var articlesJSON = { 'recommended': [], 'similar': [] };

// Request tab's URL
chrome.runtime.sendMessage({
    action: 'sendTabUrl'
}, function(response) {
    // Get recommended/similar articles for current article
    var encodedUrl = encodeURIComponent(response);

    chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: 'http://104.40.72.186:3000/concepts/' + encodedUrl,
    }, function(res) {
        articlesJSON = res;
    });
});

// Listen for article request from popup.js
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == 'sendArticles') {
        sendResponse(articlesJSON);
    }
});
