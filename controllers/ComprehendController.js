/**
 *  Comprehend Controller
 **/

var mongoose = require('mongoose'),
  natural = require('natural'),
	conf = require('node-config'),
	crypto = require('crypto');

// Models
var User = mongoose.model('User'),
    Topic = mongoose.model('Topic'),
    JunkTopic = mongoose.model('JunkTopic');

var NGrams = natural.NGrams,
    wordnet = new natural.WordNet('./cache'),
    tokenizer = new natural.TreebankWordTokenizer();
    natural.LancasterStemmer.attach();

exports.controller = function(req, res, next) {
	Controller.call(this, req, res, next);
	var self = this;
	
	self.index = function() {
		//if (!req.require_authentication()) { return; }
		
		if (req.body.content) {
		  var message = req.body.content;
		  
		  var message = message.toLowerCase();

  		var url_pattern = /\(?\bhttps?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|]/gi;
  		var hash_pattern = /#[a-zA-Z_0-9]*/gi;

  		var urls = message.match(url_pattern) || [];
  		var hashtags = message.match(hash_pattern) || [];

  		var keywords = [];
  		var topics = [];

  		// Add URLs to list of keywords
  		urls.forEach(function(url) {
  			var domain = url.substr(url.indexOf("//") + 2);
  			// Cut off at first slash in URL, if one exists
  			domain = domain.substr(0, domain.indexOf("/")) || domain;
  			merge(keywords, domain);
  		});

  		// Add hashtags
  		hashtags.forEach(function(tag) {
  			tag = tag.substring(1);
  			merge(keywords, tag);
  		});

  		// Natural language analysis of remainder of message
  		message = message
  					.remove_urls()
  					.remove_hashtags()
  					.remove_screen_names()
  					.replace_punctuation();
  		var chunks = message.split(" ");
  		var new_chunks = [];
  		chunks.forEach(function(chunk) {
  			// Not sure the purpose of this
  			if (chunk.indexOf("'") == -1) {
  				new_chunks.push(chunk);
  			}
  		});
  		var words = tokenizer.tokenize(message);

  		var ngram_length = words.length;
  		var phrases = [];
  		while (ngram_length > 1) {
  			var tmp_ngrams = NGrams.ngrams(words, ngram_length);
  			tmp_ngrams.forEach(function(phrase) {
  				phrases.push({text: phrase.join(" ")});
  				phrases.push({text: phrase.join("")});
  			});
  			ngram_length--;
  		}

  		var tmp_words = [];
  		words.forEach(function(word) {
  			if (word.length > 2) {
  				tmp_words.push(word);
  			}
  		});
  		words = tmp_words;

  		check_phrases();

  		// Check topics for phrase matches
  		function check_phrases() {
  			//console.log(phrases);
  			if (phrases.length > 0) {
    			Topic.find()
    				.or(phrases)
    				.run(function(err, _topics) {
    				if (!err && _topics) {
    					_topics.forEach(function(topic) {
    						merge(words, topic.text);
    					});
    				}
    				remove_topics_from_words();
    			});
  			} else {
  				remove_topics_from_words();
			  }
  		}
      
  		function remove_topics_from_words () {
  			var tmp_words = [];
        
  			JunkTopic.find({text: {"$in": words}}, function(err, _topics) {
  				if (err || !_topics) {
  					_topics = [];
  				}
  				words.forEach(function(word) {
  					var found = false;
  					_topics.forEach(function(topic) {
  						if (topic.text == word) {
  							found = true;
  						}
  					});
  					if (!found && word.length > 3) {
  						tmp_words.push(word);
  					}
  				});
  				words = tmp_words;
  				tmp_words = [];
  				//console.log("okay, let's go! lookup_next_word()!");
          
  				Topic.find({text: {"$in": words}}, function(err, _topics) {
  					if (err || !_topics) {
  						_topics = [];
  					}
  					words.forEach(function(word) {
  						var found = false;
  						_topics.forEach(function(topic) {
  							if (topic.text == word) {
  								found = true;
  							}
  						});
  						if (found) {
  							keywords.push(word);
  						} else {
  							tmp_words.push(word);
  						}
  					});
            
  					words = tmp_words;
            
  					lookup_next_word();
  				});

  			});
  		}
      
  		function lookup_next_word() {
  			if (words.length == 0) {
  				return add_topics();
  			}
  			word = words.shift();

  			var neither = 0;
  			var noun = 0;
  			var verb = 0;

  			if (word.length > 3) {
  				// Numbers
  				if (word.match(/^[0-9]*$/)) {
  					classify_word(word, noun, verb, neither);
  				// Everything else
  				} else {
  					wordnet.lookup(word, function(results) {
  						results.forEach(function(result) {
  							if (result.pos == "n") {
  								noun++;
  							} else if (result.pos == "v") {
  								verb++;
  							} else if (result.pos == "a" || 
  									   result.pos == "r" || 
  									   result.pos == "s") {
  								neither++;
  							}
  						});
  						classify_word(word, noun, verb, neither);
  					});
  					return;
  				}
  			// Automatically junk any word under 4 characters
  			} else {
  				save_junk_topic(word);
  				lookup_next_word();
  			}
  		}

  		function classify_word(w, n, v, neither) {
  			if (n === 0 && neither > v) {
  				save_junk_topic(w);
  			} else {
  				merge(keywords, w);
  			}
  			lookup_next_word();
  		}

  		function save_junk_topic(word) {
  			JunkTopic.findOne({text: word}, function(err, topic) {
  				if (err || (topic && topic.text == word)) {
  					return;
  				}
  				var junker = new JunkTopic({text: word});
  				junker.save(function(err) {
  					// err?
  				});
  			});
  		}

  		function add_topics() {
  			var existing_topics = [];
  			//console.log("Getting topics");

  			if (keywords.length > 0) {
  				Topic.find({text: {"$in": keywords}}, function (err, t) {
  					existing_topics = t;
  					add_new_topics();
  				});
  			} else {
  				done_with_topics();
  			}
        
  			function add_new_topics() {
  				var new_topics = [];
  				keywords.forEach(function (keyword) {
  					var found = false;
  					existing_topics.forEach(function (existing) {
  						if (existing.text == keyword) {
  							found = true;
  						}
  					});
  					if (!found) {
  						new_topics.push(keyword);
  					}
  				});
          
  				function add_each_topic() {
  					if (new_topics.length == 0) {
  						return done_adding();
  					}
  					topic_text = new_topics.shift();
  					var topic = new Topic({text: topic_text});
  					topic.save(function(err) {
  						add_each_topic();
  					});
  				}
  				add_each_topic();
  			}
        
  			function unique_ids (ids) {
  				var unique = [];

  				ids.forEach(function (id) {
  					var found = false;
  					unique.forEach(function (u) {
  						if (String(u) == String(id)) {
  							found = true;
  						}
  					});
  					if (!found) {
  						unique.push(id);
  					}
  				});
  				return unique;
  			}

  			function done_adding() {
  				var topic_ids = [];
  				var topic_texts = [];
  				Topic.find({text: {"$in": keywords}}, function(err, t) {
  					t.forEach(function(topic) {
  						topic_ids.push(topic.id);
  						topic_texts.push(topic.text);
  					});
  					if (!topics || !(topics.length > 0)) {
  						topics = topic_ids;
  					} else {
  						topic_ids.forEach(function(new_topic) {
  							merge(topics, new_topic);
  						});
  					}
  					//console.log("ADDED TOPIC IDS! "+topics.length);
  					//console.log(self.message);
  					//console.log("Topics: "+topic_texts.join(", "));

  					done_with_topics();
  				});

  			}

  			function done_with_topics() {
  				Topic.find({_id: {"$in": topics}}, function(err, results) {
    		    res.send(results);
				  });
		    }
	    }
	  } else {
	    res.send("No query?");
    }
	}
	// end /comprehend/index
};

if (!String.prototype.remove_urls) {
	String.prototype.remove_urls = function () {
		var url_pattern = /\(?\bhttps?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|]/gi;
		return this.replace(url_pattern, "");
	}
}
if (!String.prototype.remove_hashtags) {
	String.prototype.remove_hashtags = function () {
		var hash_pattern = /(^|\s)#[-A-Za-z0-9_]+(\s|$)/gi;
		return this.replace(hash_pattern, "$1$2");
	}
}
if (!String.prototype.remove_screen_names) {
	String.prototype.remove_screen_names = function () {
		var at_pattern = /(^|\s)@[-A-Za-z0-9_]+(\s|$)/gi;
		return this.replace(at_pattern, "$1$2");
	}
}
if (!String.prototype.replace_punctuation) {
	String.prototype.replace_punctuation = function () {
		var alpha_pattern = /[^a-z^A-Z^0-9^-^_]/gi;
		return this.replace(alpha_pattern, " ");
	}
}

// Add an item to the array, if it doesn't already exist,
// in order to mimic a set
function merge(array, newItem) {
	array.forEach(function(i) {
		if (i === newItem) return;
	});
	array.push(newItem);
} 
