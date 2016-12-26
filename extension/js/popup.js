var vm = new Vue({
  // options
});

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

function toggleMoreRecommendedArticles() {
    var moreRecommenededArticlesToggle = document.getElementById('more-recommeneded-articles-toggle');

}

function openLink() {
    var href = this.href;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var tab = tabs[0];
        chrome.tabs.update(tab.id, { url: href });
    });
}

function sortedArticlesByNewsSite(articles) {
    var sortedArticles = {};
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        console.log(article);

        if (!sortedArticles[article['source_name']]) {
            sortedArticles[article['source_name']] = [];
        }

        sortedArticles[article['source_name']].push(article);
    }

    return sortedArticles;
}

function renderRecommendedArticles(recommendedArticles) {
    var topRecommenededArticleDiv = document.getElementById('top-recommended-article');
    var otherRecommendedArticlesDiv = document.getElementById('other-recommended-articles-toggle');

    var topRecommenededArticle = recommendedArticles[0];
    var otherRecommendedArticles = recommendedArticles.slice(1, recommendedArticles.length);
    var sortedRecommendedArticles = sortedArticlesByNewsSite(otherRecommendedArticles);

    // Add recommended article
    var titleHTML = '<h3><a href="' + topRecommenededArticle['url'] + '">' +
        topRecommenededArticle['source_name'] + ': ' +
        topRecommenededArticle['title'] +
    '</a></h3>';
    var readableDate = moment(topRecommenededArticle['date']).format('MM/DD/YYYY');
    var subTitleHTML = '<h5>' + readableDate + '</h5>'

    topRecommenededArticleDiv.innerHTML += '<h2>Recommended Article</h2>'
    topRecommenededArticleDiv.innerHTML += titleHTML;
    topRecommenededArticleDiv.innerHTML += subTitleHTML;

    otherRecommendedArticlesDiv.innerHTML += '<span class="toggle" id="more-recommeneded-articles-toggle">(+) Show More Recommendations</span>';
    otherRecommendedArticlesDiv.addEventListener('click', toggleMoreRecommendedArticles);

    otherRecommendedArticlesDiv.innerHTML += '<h2>More Recommended Articles</h2>'

    for (var sourceNameAsKey in sortedRecommendedArticles) {
        var sortedArticles = sortedRecommendedArticles[sourceNameAsKey];

        var title = '<h3>' + sourceNameAsKey + '</h3>';
        otherRecommendedArticlesDiv.innerHTML += title;

        for (var i = 0; i < sortedArticles.length; i++) {
            var article = sortedArticles[i];

            var readableDate = moment(article['date']).format('MM/DD/YYYY');
            var link = '<a href="' + article['url'] + '">' + article['title'] +
            ' (' + readableDate + ')</a><br/>';
            otherRecommendedArticlesDiv.innerHTML += link;
        }
    }
}

function renderSimilarArticles(similarArticles) {
}

function renderArticles(articlesJSON) {

    var recommendedArticles = articlesJSON['recommended'];
    var similarArticles = articlesJSON['similar'];
    var sortedArticles = {};

    if (recommendedArticles.length == 0) {
        return;
    }

    renderRecommendedArticles(recommendedArticles);

    if (similarArticles.length == 0) {
        return;
    }

    renderSimilarArticles(similarArticles);

    var hrefs = document.getElementsByTagName("a");

    for (var i=0,a; a=hrefs[i]; ++i) {
        hrefs[i].addEventListener('click', openLink);
    }
}

function renderBlankState() {
    document.getElementById('no-articles').innerHTML = "<h2>Couldn't find related articles</h2>";
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

                    if (json['recommended'].length == 0 && json['similar'].length == 0) {
                        return renderBlankState();
                    }

                    renderArticles(json);
                }
            }
        };

        xhr.send();

        console.log("SENT");
    });
});
