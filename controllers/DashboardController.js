/**
 *  Dashboard Controller
 **/

var mongoose = require('mongoose'),
  fs = require('fs'),
	conf = require('node-config'),
	crypto = require('crypto');

// Models
var User = mongoose.model('User'),
    JunkTopic = mongoose.model('JunkTopic');

exports.controller = function(req, res, next) {
	Controller.call(this, req, res, next);
	var self = this;
	
	self.index = function() {
		if (!req.require_authentication("/dashboard")) { return; }
		
		self.render("dashboard/dashboard");
	}
	// end /dashboard/index
	
	self.junk_topics = function () {
	  
	  check_junk_topics();
	  
	  function check_junk_topics () {
			JunkTopic.count({}, function (err, count) {
				if (err) throw err;
				
				if (count == 0) {
					fs.readFile('cache/junk_topics.json', 'utf8', add_missing_junk_topics);
				} else {
					finished();
				}
			});
		}
		
		function add_missing_junk_topics (err, content) {
			var junk_topics = [];
			if (!err) {
				junk_topics = JSON.parse(content);
			}
			
			if (junk_topics.length > 0) {
				JunkTopic.find({"text": {"$in":junk_topics}}, function (err, existing) {
					if (err) throw err;
		
					var new_junk_topics = [];
		
					junk_topics.forEach(function (t) {
						var found = false;
						existing.forEach(function (et) {
							if (!found && et.text.toLowerCase() == t.toLowerCase()) {
								found = true;
							}
						});
						if (!found) {
							var jt = new JunkTopic({text: t});
							jt.save(function (err) {
								if (err) throw err;
							});
						}
					});
					finished();
				});
			} else {
				finished();
			}
			
		}
		
		function finished () {
		  self.send("Done.");
	  }
	}
};