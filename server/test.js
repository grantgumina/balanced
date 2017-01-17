// var pos = require('pos');
//
// var words = new pos.Lexer().lex('Cuban-American lawmakers blast Obama\'s Cuban policy reforms');
// var tagger = new pos.Tagger();
// var taggedWords = tagger.tag(words);
//
// for (i in taggedWords) {
//     var taggedWord = taggedWords[i];
//     var word = taggedWord[0];
//     var tag = taggedWord[1];
//     console.log(word + " /" + tag);
// }

var path = require('path');
var pg = require('pg');
var fs = require('fs');
var moment = require('moment');

var creds = fs.readFileSync(path.resolve(__dirname, '../creds.txt')).toString().split('\n');
console.log(creds);

var db_username = creds[0].trim();
var db_password = creds[1].trim();
var db_name = creds[2].trim();

var config = {
    user: db_username,
    database: db_name,
    password: db_password,
    // host: 'localhost',
    host: '40.78.99.54',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
};

var pool = new pg.Pool(config);
pool.on('error', function (err, client) {
    console.error('idle client error', err.message, err.stack)
})

var articleUrl = 'http://www.nytimes.com/2017/01/14/world/middleeast/israel-energy-boom.html';

var queryString = `SELECT date FROM articles WHERE url = '` + articleUrl + `'`;

pool.query(queryString, function(error, result) {
    if (error) {
        console.log("getDateArticleWasPublished - ERROR");
        console.log(error);
        return callback(error);
    }

    console.log(result.rows[0]['date']);
    var articlePublishedDate = result.rows[0]['date'];

    var lowestDate =  moment(articlePublishedDate).subtract(3, 'day').toDate();
    var highestDate =  moment(articlePublishedDate).add(3, 'day').toDate();

    console.log(articlePublishedDate);
    moment(lowestDate).format('YYYY-MM-DD');
    moment(highestDate).format('YYYY-MM-DD');

});
