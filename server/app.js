var express = require('express');
var async = require('async');
var path = require('path');
var url = require('url');
var pg = require('pg');
var fs = require('fs');
var app = express();

var creds = fs.readFileSync(path.resolve(__dirname, '../creds.txt')).toString().split('\n');
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

function isHostnameAffiliated(siteNames, hostname) {
    for (var i = 0; i < siteNames.length; i++) {
        var siteName = siteNames[i];
        if (hostname.includes(siteName)) {
            return true;
        }
    }

    return false;
}

function buildConceptsFilterString(concepts) {
    var conceptsFilterString = '';

    for (var i = 0; i < concepts.length; i++) {
        var concept = concepts[i];

        // name = 'Christmas' AND score >= 5)
        var cfs = "(name = '" + concept['name'] + "' AND score >= " +
        concept['score'] + ")";

        // If this concept isn't the last one
        if (!((i + 1) >= concepts.length)) {
            cfs += " OR "
        }

        conceptsFilterString += cfs;
    }

    return conceptsFilterString;
}

function buildRecomendedNewsSourcesString(sourceInformation, hostname) {
    var recommendedNewsSourcesString = '';

    var conservativeNewsHostnames = sourceInformation['conservative']['hostnames'];
    var rightLeaningNewsHostnames = sourceInformation['right_leaning']['hostnames'];
    var moderateNewsHostnames = sourceInformation['moderate']['hostnames'];
    var leftLeaningNewsHostnames = sourceInformation['left_leaning']['hostnames'];
    var liberalNewsHostnames = sourceInformation['liberal']['hostnames'];

    if (isHostnameAffiliated(conservativeNewsHostnames, hostname)) {
        // Recommend articles from liberal and left leaning news sources
        recommendedNewsSourcesString = "'liberal', 'left_leaning'";
    } else if (isHostnameAffiliated(rightLeaningNewsHostnames, hostname)) {
        // Recommend articles from left leaning and liberal news sources
        recommendedNewsSourcesString = "'left_leaning', 'liberal'";
    } else if (isHostnameAffiliated(moderateNewsHostnames, hostname)) {
        // Recommend articles from conservative and liberal news sources
        recommendedNewsSourcesString = "'conservative', 'liberal'";
    } else if (isHostnameAffiliated(leftLeaningNewsHostnames, hostname)) {
        // Recommend articles from right leaning and conservative news sources
        recommendedNewsSourcesString = "'right_leaning', 'conservative'";
    } else if (isHostnameAffiliated(liberalNewsHostnames, hostname)) {
        // Recommend articles from conservative and right leaning news sources
        recommendedNewsSourcesString = "'conservative', 'right_leaning'";
    }

    return recommendedNewsSourcesString;
}

function buildSimilarNewsSourcesString(sourceInformation, hostname) {
    var similarNewsSourcesString = '';

    var conservativeNewsHostnames = sourceInformation['conservative']['hostnames'];
    var rightLeaningNewsHostnames = sourceInformation['right_leaning']['hostnames'];
    var moderateNewsHostnames = sourceInformation['moderate']['hostnames'];
    var leftLeaningNewsHostnames = sourceInformation['left_leaning']['hostnames'];
    var liberalNewsHostnames = sourceInformation['liberal']['hostnames'];

    if (isHostnameAffiliated(conservativeNewsHostnames, hostname)) {
        // Recommend articles from liberal and left leaning news sources
        similarNewsSourcesString = "'conservative', 'right_leaning'";
    } else if (isHostnameAffiliated(rightLeaningNewsHostnames, hostname)) {
        // Recommend articles from left leaning and liberal news sources
        similarNewsSourcesString = "'right_leaning', 'conservative'";
    } else if (isHostnameAffiliated(moderateNewsHostnames, hostname)) {
        // Recommend articles from conservative and liberal news sources
        similarNewsSourcesString = "'moderate'";
    } else if (isHostnameAffiliated(leftLeaningNewsHostnames, hostname)) {
        // Recommend articles from right leaning and conservative news sources
        similarNewsSourcesString = "'left_leaning', 'liberal'";
    } else if (isHostnameAffiliated(liberalNewsHostnames, hostname)) {
        // Recommend articles from conservative and right leaning news sources
        similarNewsSourcesString = "'liberal', 'left_leaning'";
    }

    return similarNewsSourcesString;
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
            console.log("getConceptsFromArticleUrl - 2 - ERROR");
            console.log(error);
            return callback(error);
        }
        callback(null, result.rows, client, done, articleUrl, sourceInformation);
    });
}

function getArticles(concepts, client, done, articleUrl, sourceInformation, callback) {

    if (concepts.length == 0) {
        var articlesJSON = { 'recommended': [], 'similar': [], 'same': [] };
        return callback(null, articlesJSON);
    }

    var articleSourceHostname = url.parse(articleUrl).hostname;
    var conceptsFilterString = buildConceptsFilterString(concepts);
    var recommendedNewsSourcesString = buildRecomendedNewsSourcesString(sourceInformation, articleSourceHostname);
    var similarNewsSourcesString = buildSimilarNewsSourcesString(sourceInformation, articleSourceHostname);

    // From the concepts returned by getConceptsFromArticleUrl
    async.parallel({
        // Get recommended articles
        recommended: function (cb) {
            getArticlesFromSourcesWithCertainPoliticalAffiliations(client, done, conceptsFilterString, recommendedNewsSourcesString, articleUrl, cb);
        },
        // Get similar articles
        similar: function (cb) {
            getArticlesFromSourcesWithCertainPoliticalAffiliations(client, done, conceptsFilterString, similarNewsSourcesString, articleUrl, cb);
        }
        // TODO
        // Get same articles
    }, function asyncComplete(error, articlesJSON) {

        done();

        if (error) {
            return callback(error);
        }
        callback(null, articlesJSON);
    });
}

function getArticlesFromSourcesWithCertainPoliticalAffiliations(client, done, conceptsFilterString, politicalAffiliationString, articleUrl, callback) {
    var queryString = `SELECT * FROM articles, news_sources
                        WHERE articles.id IN (
                            SELECT article_id
                                FROM (
                                    SELECT *
                                    FROM concepts
                                    WHERE (
                                        ` + conceptsFilterString + `
                                    )
                                )
                            AS arts
                            GROUP BY article_id HAVING count(article_id) > 1
                        )
                        AND articles.url <> '` + articleUrl + `'
                        AND news_sources.display_name = articles.source_name
                        AND news_sources.political_affiliation IN
                            (` + politicalAffiliationString + `)
                        ORDER BY articles.date DESC;`;

    client.query(queryString, function (error, result) {
        if (error) {
            return callback(error);
        }

        callback(null, result.rows);
    });
}

// Routes
app.get('/concepts/:url', function (req, res) {
    var articleUrl = '' + req.params.url + '';

    async.waterfall([
        connectToDatabase,
        getSourceInformation,
        async.apply(getConceptsFromArticleUrl, articleUrl),
        getArticles
    ], function asyncComplete(error, result) {
        if (error) {
            console.log(error);
            return res.send(error);
        }

        var json = JSON.stringify(result);

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
