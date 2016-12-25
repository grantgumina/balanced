var express = require('express')
var async = require('async')
var url = require('url');
var pg = require('pg')
var fs = require('fs')
var app = express()

// var liberal_news_sources_hostnames = ['motherjones.com', 'slate.com', 'salon.com'];
// var left_leaning_news_sources_hostnames = ['nbcnews.com', 'abcnews', 'cbsnews.com', 'cnn.com', 'usatoday.com', 'bloomberg.com', 'reuters.com', 'washingtonpost.com'];
// var moderate_news_sources_hostnames = ['forbes.com'];
// var right_leaning_news_sources_hostnames = ['foxnews.com', 'pagesix.com', 'economist.com', 'wsj.com'];
// var conservative_news_sources_hostnames = ['nationalreview.com', 'dailycaller.com', 'theblaze.com', 'breitbart.com', 'washingtonexaminer.com'];
// var international_news_sources_hostnames = ['aljazeera.com', 'theguardian.com', 'bbc.co.uk', 'rt.com'];

var creds = fs.readFileSync('../scrapers/creds.txt').toString().split('\n');
console.log(creds);

var db_username = creds[0].trim();
var db_password = creds[1].trim();
var db_name = creds[2].trim();

var config = {
    user: db_username,
    database: db_name,
    password: db_password,
    host: 'localhost',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
};

var pool = new pg.Pool(config);
pool.on('error', function (err, client) {
    // if an error is encountered by a client while it sits idle in the pool
    // the pool itself will emit an error event with both the error and
    // the client which emitted the original error
    // this is a rare occurrence but can happen if there is a network partition
    // between your application and the database, the database restarts, etc.
    // and so you might want to handle it and at least log it out
    console.error('idle client error', err.message, err.stack)
})

function connectToDatabase(callback) {
    pool.connect(function (error, client, done) {
        if (error) {
            callback(error);
            return;
        }

        callback(null, client, done);
    });
}

function getSourceInformation(client, done, callback) {

    async.parallel({
        conservative: function (cb) {
            client.query("SELECT partial_hostname, display_name FROM news_sources WHERE political_affiliation = 'conservative';",
            function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, result.rows);
            });
        },
        right_leaning: function (cb) {
            client.query("SELECT partial_hostname, display_name FROM news_sources WHERE political_affiliation = 'right_leaning';",
            function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, result.rows);
            });
        },
        moderate: function (cb) {
            client.query("SELECT partial_hostname, display_name FROM news_sources WHERE political_affiliation = 'moderate';",
            function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, result.rows);
            });
        },
        left_leaning: function (cb) {
            client.query("SELECT partial_hostname, display_name FROM news_sources WHERE political_affiliation = 'left_leaning';",
            function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, result.rows);
            });
        },
        liberal: function (cb) {

            client.query("SELECT partial_hostname, display_name FROM news_sources WHERE political_affiliation = 'liberal';",
            function (error, result) {
                if (error) {
                    // done();
                    return cb(error);
                }

                cb(null, result.rows);
            });
        }
    }, function (error, results) {
        if (error) {
            done();
            return callback(error);
        }

        var returnedInfo = {
            'conservative': {
                'hostnames': [],
                'source_names': []
            },
            'right_leaning': {
                'hostnames': [],
                'source_names': []
            },
            'moderate': {
                'hostnames': [],
                'source_names': []
            },
            'left_leaning': {
                'hostnames': [],
                'source_names': []
            },
            'liberal': {
                'hostnames': [],
                'source_names': []
            }
        };

        for (political_affiliation in results) {
            var information = results[political_affiliation];
            console.log(information);
            for (key in information) {
                var info = information[key];
                returnedInfo[political_affiliation]['hostnames'].push(info['partial_hostname']);
                returnedInfo[political_affiliation]['source_names'].push(info['display_name']);
            }
        }

        callback(null, client, done, returnedInfo);
    });
}

function getConceptsFromArticleUrl(articleUrl, client, done, sourceInformation, callback) {

    var queryString = `SELECT * FROM concepts WHERE article_id = (
                            SELECT id
                            FROM articles WHERE url = '` + articleUrl + `'
                        ) ORDER BY score DESC LIMIT 5;`;

    client.query(queryString, function (error, result) {
        if (error) {
            done();
            return callback(error);
        }

        callback(null, result.rows, client, done, articleUrl, sourceInformation);
    });
}

function getRelatedArticlesByScoredConcepts(concepts, client, done, articleUrl, sourceInformation, callback) {

    if (concepts.length == 0) {
        return callback([]);
    }

    var conceptFilterString = '';

    for (var i = 0; i < concepts.length; i++) {
        var concept = concepts[i];

        // name = 'Christmas' AND score >= 5)
        var cfs = "(name = '" + concept['name'] + "' AND score >= " +
        concept['score'] + ")";

        // If this concept isn't the last one
        if (!((i + 1) >= concepts.length)) {
            cfs += " OR "
        }

        conceptFilterString += cfs;
    }


    var queryString = `SELECT * FROM articles WHERE id IN (
                        SELECT article_id
                            FROM (
                                SELECT *
                                FROM concepts
                                WHERE (
                                    ` + conceptFilterString + `
                                )
                            )
                            AS arts
                            GROUP BY article_id HAVING count(article_id) > 1
                        );`;

    client.query(queryString, function (error, result) {
        done()
        if (error) {
            return callback(error);
        }

        return callback(null, result.rows, articleUrl, sourceInformation);
    });
}

function sortArticles(articlesJSON, articleUrl, sourceInformation, callback) {

    var conservativeNewsHostnames = sourceInformation['conservative']['hostnames'];
    var rightLeaningNewsHostnames = sourceInformation['right_leaning']['hostnames'];
    var moderateNewsHostnames = sourceInformation['moderate']['hostnames'];
    var leftLeaningNewsHostnames = sourceInformation['left_leaning']['hostnames'];
    var liberalNewsHostnames = sourceInformation['liberal']['hostnames'];

    var conservativeNewsDisplayNames = sourceInformation['conservative']['hostnames'];
    var rightLeaningNewsDisplayNames = sourceInformation['right_leaning']['display_names'];
    var moderateNewsDisplayNames = sourceInformation['moderate']['display_names'];
    var leftLeaningNewsDisplayNames = sourceInformation['left_leaning']['display_names'];
    var liberalNewsDisplayNames = sourceInformation['liberal']['display_names'];

    var hostname = url.parse(articleUrl).hostname;
    var sortedArticles = {};
    var returnedArticleJSON = { "recommended": [], "similar": [], "same": [] };

    // Sort articles by news site
    for (var i = 0; i < articlesJSON.length; i++) {
        var article = articlesJSON[i];
        if (!sortedArticles[article['source_name']]) {
            sortedArticles[article['source_name']] = [];
        }

        sortedArticles[article['source_name']].push(article);
    }

    // Recommended articles
    // If the article is conservative, recommend liberal ones
    if (isHostnameAffiliated(conservativeNewsHostnames, hostname)) {
        
    }

    if (isHostnameAffiliated(liberalNewsHostnames, hostname)) {
        // for (var i = 0; i < conservativeNewsDisplayNames.length; i++) {
        //     var conservativeNewsDisplayName = conservativeNewsDisplayNames[i];
        //     returnedArticleJSON['recommended'].push(sortedArticles[conservativeNewsHostname]);
        // }
        //
        // for (var i = 0; i < rightLeaningNewsHostnames.length; i++) {
        //     var rightLeaningNewsDisplayName = rightLeaningNewsDisplayNames[i];
        //     returnedArticleJSON['recommended'].push(sortedArticles[rightLeaningNewsHostname]);
        // }
        //
        // for (var i = 0; i < leftLeaningNewsHostnames.length; i++) {
        //     var liberalNewsHostname = leftLeaningNewsHostnames[i];
        //     returnedArticleJSON['similar'].push(sortedArticles[liberalNewsHostname]);
        // }
        //
        // for (var i = 0; i < liberalNewsHostnames.length; i++) {
        //     var rightLeaningNewsDisplayName = rightLeaningNewsDisplayNames[i];
        //     if (liberalNewsHostname != hostname) {
        //         returnedArticleJSON['similar'].push(sortedArticles[liberalNewsHostname]);
        //     }
        // }
        //
        // returnedArticleJSON['same'].push(sortedArticles[hostname]);
    }

    // console.log(returnedArticleJSON['recommended']);
    return callback(returnedArticleJSON);
}

function isHostnameAffiliated(siteNames, hostname) {
    for (var i = 0; i < siteNames.length; i++) {
        var siteName = siteNames[i];
        if (hostname.includes(siteName)) {
            return true;
        }
    }

    return false;
}

// Routes
app.get('/concepts/:url', function (req, res) {
    var articleUrl = '' + req.params.url + '';

    async.waterfall([
        connectToDatabase,
        getSourceInformation,
        async.apply(getConceptsFromArticleUrl, articleUrl),
        getRelatedArticlesByScoredConcepts,
        sortArticles
    ], function asyncComplete(error, result) {
        if (error) {
            console.log(error);
            return res.send(error);
        }

        var json = JSON.stringify(result);

        res.writeHead(200, {
            'content-type':'application/json',
            'content-length': Buffer.byteLength(json)
        });

        return res.send(json);
    });
});

app.get('/', function (req, res) {
    async.waterfall([
        connectToDatabase,
        getRandomEventUri,
        getRelatedArticlesByEventId
    ], function asyncComplete(error, result) {
        if (error) {
            console.log(error);
            return res.send(error);
        }

        return res.send(result);
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});
