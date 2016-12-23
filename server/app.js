var express = require('express')
var async = require('async')
var url = require('url');
var pg = require('pg')
var fs = require('fs')
var app = express()

var liberal_news_sources_hostnames = ['motherjones.com', 'slate.com', 'salon.com'];
var left_leaning_news_sources_hostnames = ['nbcnews.com', 'abcnews', 'cbsnews.com', 'cnn.com', 'usatoday.com', 'bloomberg.com', 'reuters.com', 'washingtonpost.com'];
var moderate_news_sources_hostnames = ['forbes.com'];
var right_leaning_news_sources_hostnames = ['foxnews.com', 'pagesix.com', 'economist.com', 'wsj.com'];
var conservative_news_sources_hostnames = ['nationalreview.com', 'dailycaller.com', 'theblaze.com', 'breitbart.com', 'washingtonexaminer.com'];
var international_news_sources_hostnames = ['aljazeera.com', 'theguardian.com', 'bbc.co.uk', 'rt.com'];

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

function getRandomArticleId(client, done, callback) {

    client.query('SELECT id FROM articles ORDER BY random() LIMIT 1;',
    function (error, result) {
        if (error) {
            done();
            callback(error);
            return;
        }

        callback(null, result.rows[0].id, client, done);
    });
}

function getRelatedArticlesByEventRegistryConceptIds(articleId, client, done, callback) {
    var queryString = `SELECT * FROM articles WHERE id in (SELECT article_id
        FROM concepts WHERE concepts.event_registry_id IN (SELECT
            event_registry_id FROM concepts WHERE article_id = ` + articleId +
        `));`

    client.query(queryString, function (error, result) {
        done();

        var articles = result.rows;

        callback(articles);
    })
}

function getRandomEventUri(client, done, callback) {
    var queryString = `SELECT event_uri FROM articles WHERE event_uri <> 'None'
        GROUP BY event_uri HAVING COUNT(*) > 1 ORDER BY random() LIMIT 1`;

    client.query(queryString, function (error, result) {
        if (error) {
            done();
            callback(error);
            return;
        }

        callback(null, result.rows[0].event_uri, client, done);
    });
}

function getRelatedArticlesByEventId(eventUri, client, done, callback) {
    var queryString = "SELECT * FROM articles WHERE event_uri = '" + eventUri + "'";
    client.query(queryString, function (error, result) {
        done();

        if (error) {
            return callback(error);
        }

        callback(result.rows);
    });
}

function getRelatedArticlesByEventIdFromArticleUrl(articleUrl, client, done, callback) {
    var queryString = `SELECT * FROM articles WHERE event_uri = (
      SELECT event_uri FROM articles WHERE url = '` + articleUrl + `'
  ) AND date > (SELECT date FROM articles WHERE url = '` + articleUrl + `') - 2;`

    client.query(queryString, function (error, result) {
        done();

        if (error) {
            return callback(error);
        }

        callback(result.rows);
    });
}

function getConceptsFromArticleUrl(articleUrl, client, done, callback) {
    var queryString = `SELECT * FROM concepts WHERE article_id = (
                            SELECT id
                            FROM articles WHERE url = '` + articleUrl + `'
                        ) ORDER BY score DESC LIMIT 5;`;

    client.query(queryString, function (error, result) {
        if (error) {
            done();
            return callback(error);
        }

        callback(null, result.rows, client, done);
    });
}

function getRelatedArticlesByScoredConcepts(concepts, client, done, callback) {
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

        callback(result.rows);
    });
}

function sortArticles(articlesJSON, articleUrl) {
    var hostname = url.parse(articleUrl).hostname;

    var sortedArticles = {};
    var returnedArticleJSON = { "recommended": [], "similar": [], "same": [] };

    // Sort articles by news site
    for (var i = 0; i < articlesJSON.length; i++) {
        var article = articlesJSON[i];
        console.log(article);

        if (!sortedArticles[article['source_name']]) {
            sortedArticles[article['source_name']] = [];
        }

        sortedArticles[article['source_name']].push(article);
    }

    if (isHostnameAffiliated(liberal_news_sources_hostnames, hostname)) {

    } else if (isHostnameAffiliated(left_leaning_news_sources_hostnames, hostname)) {

    } else if (isHostnameAffiliated(moderate_news_sources, hostname)) {

    } else if (isHostnameAffiliated(right_leaning_news_sources_hostnames, hostname)) {

    } else if (isHostnameAffiliated(conservative_news_sources_hostnames, hostname)) {

    }
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
    var articleUrl = req.params.url;

    async.waterfall([
        connectToDatabase,
        async.apply(getConceptsFromArticleUrl, articleUrl),
        getRelatedArticlesByScoredConcepts,
        async.apply(articleUrl)
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

app.get('/event/:url', function (req, res) {
    console.log("GET RELATED ARTICLES BY EVENT URI");
    var articleUrl = req.params.url;

    async.waterfall([
        connectToDatabase,
        async.apply(getRelatedArticlesByEventIdFromArticleUrl, articleUrl)
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
