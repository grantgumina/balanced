var articlesJSON = { 'recommended': [], 'similar': [] };

// Request tab's URL
chrome.runtime.sendMessage({ action: 'sendTabUrl' }, null);

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    // Listen for article request from popup.js
    if (request.action == 'sendArticles') {
        sendResponse(articlesJSON);
    } else if (request.action == 'receiveTabUrl') {
        // Listen for tab's URL
        var encodedUrl = encodeURIComponent(request.url);

        chrome.runtime.sendMessage({
            method: 'GET',
            action: 'xhttp',
            // url: 'http://localhost:3000/concepts/' + encodedUrl,
            url: 'http://40.78.99.54:3000/concepts/' + encodedUrl,
        }, function (res) {
            articlesJSON = res;

            var number = 0;
            if (articlesJSON.recommended.length > 0) {
                number = articlesJSON.recommended.length
            } else if (articlesJSON.similar.length > 0) {
                number = articlesJSON.similar.length
            }

            // Set badge text for this specific tab
            if (number > 0) {
                chrome.runtime.sendMessage({ action: 'setBadgeText', number: number }, null);
            }
        });
    }
});
