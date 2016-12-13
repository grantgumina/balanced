var express = require('express')
var async = require('async')
var pg = require('pg')
var fs = require('fs')
var app = express()

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
            callback(error);
            return;
        }

        callback(result.rows);
    });
}

app.get('/', function (req, res) {

    // async.waterfall([
    //     connectToDatabase,
    //     getRandomArticleId,
    //     getRelatedArticlesByEventRegistryConceptIds
    // ], function asyncComplete (error, result) {
    //     if (error) {
    //         console.log(error);
    //         return res.send(error);
    //     }
    //
    //     return res.send(result);
    // });


    async.waterfall([
        connectToDatabase,
        getRandomEventUri,
        getRelatedArticlesByEventId
    ], function asyncComplete (error, result) {
        if (error) {
            console.log(error);
            return res.send(error);
        }

        return res.send(result);
    });
})

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})
