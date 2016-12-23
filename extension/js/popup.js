function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];
        var url = tab.url;
        callback(url);
    });
}

function openLink() {
    var href = this.href;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var tab = tabs[0];
        chrome.tabs.update(tab.id, { url: href });
    });
}

function renderOtherArticles(articlesJSON) {
    var sortedArticles = {};

    // Sort articles by news site
    for (var i = 0; i < articlesJSON.length; i++) {
        var article = articlesJSON[i];
        console.log(article);

        if (!sortedArticles[article['source_name']]) {
            sortedArticles[article['source_name']] = [];
        }

        sortedArticles[article['source_name']].push(article);
    }

    for (var key in sortedArticles) {
        var articles = sortedArticles[key]

        var title = '<h3>' + key + '</h3>';
        document.getElementById('otherArticles').innerHTML += title;

        for (var i = 0; i < articles.length; i++) {
            var article = articles[i];

            var readableDate = moment(article['date']).format('MM/DD/YYYY');
            var link = '<a href="' + article['url'] + '">' + article['title'] +
            ' (' + readableDate + ')</a><br/>';
            document.getElementById('otherArticles').innerHTML += link;
        }
    }

    var hrefs = document.getElementsByTagName("a");

    for (var i=0,a; a=hrefs[i]; ++i) {
        hrefs[i].addEventListener('click', openLink);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    getCurrentTabUrl(function(url) {

        var encodedUrl = encodeURIComponent(url);

        // Ask server for related stories
        var xhr = new XMLHttpRequest();

        xhr.open("GET", "http://localhost:3000/concepts/" + encodedUrl, true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var result = xhr.responseText;
                    var json = JSON.parse(result);
                    renderOtherArticles(json);
                }
            }
        };

        xhr.send();

    });
});
