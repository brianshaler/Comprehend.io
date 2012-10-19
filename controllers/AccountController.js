/**
 *  Account Controller
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
		if (!req.require_authentication("/account")) { return; }
		
		return self.render('account/index');
	}
	
	self.signup = function () {
	  var errors = [];
	  var signup_successful = false;
	  
	  if (req.body && req.body.user_name && req.body.password) {
		  var user_name = req.body.user_name;
			var hashed_password = self._hash(req.body.password);
			var session_key = self._generate_session_key(user_name, hashed_password);
			var session_token = self._generate_token(user_name, session_key);
		  
		  if (errors.length === 0) {
  		  User.count({user_name: user_name}, function (err, count) {
  		    if (!err && count === 0) {
  		      var user = new User({
  		        user_name: user_name,
  		        password: self._hash(req.body.password),
  		        session_key: session_key,
  		        session_token: session_token
  	        });
  	        user.save(function (err) {
  	          if (err) {
  	            errors.push(err);
              } else {
          			req.session.session_key = session_key;
          			req.session.session_token = session_token;
          			req.session.user_name = user_name;
                signup_successful = true;
              }
              finished();
            });
  	      } else
  	      if (count > 0) {
  	        errors.push("User name taken.");
  	        finished();
          } else {
  	        errors.push(err);
  	        finished();
          }
  	    });
  	  } else {
  	    finished();
	    }
		} else {
		  finished();
	  }
	  
	  function finished () {
      if (signup_successful) {
        self.redirect("/dashboard");
      } else {
        self.render("account/signup", {errors: errors});
      }
    }
  }
	
	self.login = function () {
		var redirect_url = "";
		var session = req.session;
		if (req.body.user_name && req.body.password) {
			redirect_url = "/admin/login";
			User.findOne({user_name: req.body.user_name}, function (err, user) {
				if (err) throw err;
				
				if (user && user.user_name) {
					var user_name = user.user_name;
					var password = user.password;
					var session_key = user.session_key;
					
					if (req.body.user_name === user_name && self._hash(req.body.password) === password) {
						// Good to go!
						
						if (req.body.redirect_url && String(req.body.redirect_url).length > 0) {
							redirect_url = req.body.redirect_url;
						} else {
							redirect_url = "/";
						}
						
						if (!session_key || session_key == "") {
							session_key = self._generate_session_key(user_name, password);
						}
						
						var session_token = self._generate_token(user_name, session_key);
						
						session.session_key = session_key;
						session.session_token = session_token;
						session.user_name = user_name;
					} else {
						req.flash("Login failed");
					}
				}
				
				finish();
			});
		} else {
			finish();
		}
		
		function finish () {
			if (redirect_url == "") {
				if (req.query && String(req.query.redirect_url).length > 0) {
					redirect_url = req.query.redirect_url;
				}
				self.render('admin/login', {
					title: 'Login',
					user_name: req.body.user_name || "",
					redirect_url: redirect_url
				});
			} else {
				res.redirect(redirect_url);
			}
		}
	}
	
	self.logout = function () {
		var redirect_url = "/";
		var session = req.session;
		
		session.destroy();
		res.redirect("/");
	}
	
	
	// PRIVATE METHODS
	
	self._generate_session_key = function (u, p) {
		var key = "";
		key = self._hash(u+p+Date.now());
		return key;
	}
	
	self._generate_token = function (u, k) {
		token = self._hash(u+"|"+k);
		return token;
	}
	
	self._hash = function (str) {
		var hashed;
		var h = crypto.createHash('sha1');
		h.update(str);
		hashed = h.digest('hex');
		return hashed;
	}
};