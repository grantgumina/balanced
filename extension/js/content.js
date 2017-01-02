var articlesJSON = { 'recommended': [], 'similar': [] };

chrome.runtime.sendMessage({
    action: 'sendTabUrl'
}, function(response) {
    var encodedUrl = encodeURIComponent(response);
    // Get recommended/similar articles for current article
    chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: 'http://104.40.72.186:3000/concepts/' + encodedUrl,
    }, function(res) {
        articlesJSON = res;
        console.log(articlesJSON);
    });
});

// Listen for tab URL
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == 'sendArticles') {
        sendResponse(articlesJSON);
    }
});
