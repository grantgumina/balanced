window.onload = function () {

    var vm = new Vue({
        el: '#application',

        data: {
            recommendedArticles: [],
            similarArticles: [],
            showMoreRecommendedArticles: false,
            showSimilarArticles: false,
        },

        computed: {

            

            topRecommendedArticle: function() {
                if (this.recommendedArticles.length == 0) {
                    return null;
                }

                return this.recommendedArticles[0];
            },

            otherRecommendedArticles: function() {
                if (this.recommendedArticles.length == 0) {
                    return null;
                }

                console.log(this.recommendedArticles);

                return this.recommendedArticles.slice(1,
                    this.recommendedArticles.length);
            }
        },

        methods: {
            toggleMoreRecommendedArticles: function() {
                this.showMoreRecommendedArticles = !this.showMoreRecommendedArticles;
            },

            toggleSimilarArticles: function() {
                this.showSimilarArticles = !this.showSimilarArticles;
            },

            sortArticlesByNewsSite: function(articles) {
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
            },

            openLink: function(href) {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    var tab = tabs[0];
                    chrome.tabs.create({ url: href });
                });
            },

            getCurrentTabUrl: function(callback) {
                var queryInfo = {
                    active: true,
                    currentWindow: true
                };

                chrome.tabs.query(queryInfo, function(tabs) {
                    var tab = tabs[0];
                    var url = tab.url;
                    callback(url);
                });
            },

            loadData: function() {
                var main = this;
                this.getCurrentTabUrl(function(url) {
                    var encodedUrl = encodeURIComponent(url);

                    // Ask server for related stories
                    var xhr = new XMLHttpRequest();

                    xhr.open("GET", "http://localhost:3000/concepts/" + encodedUrl, true);

                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == 4) {
                            if (xhr.status == 200) {
                                var result = xhr.responseText;
                                var json = JSON.parse(result);

                                main.recommendedArticles = json['recommended'];
                                main.similarArticles = json['similar'];
                            }
                        }
                    };

                    xhr.send();

                });
            },
        }
    });

    vm.loadData();

}
