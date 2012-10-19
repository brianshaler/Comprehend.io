/**
 *  Dashboard Controller
 **/

var mongoose = require('mongoose'),
	conf = require('node-config'),
	crypto = require('crypto');

// Models
var User = mongoose.model('User');

exports.controller = function(req, res, next) {
	Controller.call(this, req, res, next);
	var self = this;
	
	self.index = function() {
		if (!req.require_authentication("/dashboard")) { return; }
		
		self.render("dashboard/dashboard");
	}
	// end /dashboard/index
};