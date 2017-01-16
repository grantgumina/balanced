var pos = require('pos');

var words = new pos.Lexer().lex('Cuban-American lawmakers blast Obama\'s Cuban policy reforms');
var tagger = new pos.Tagger();
var taggedWords = tagger.tag(words);

for (i in taggedWords) {
    var taggedWord = taggedWords[i];
    var word = taggedWord[0];
    var tag = taggedWord[1];
    console.log(word + " /" + tag);
}
