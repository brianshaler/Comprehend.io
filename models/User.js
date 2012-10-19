/**
 *  User schema
 **/

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var User = new Schema({
  user_name: {type: String, required: true}, 
  password: {type: String, required: true}, 
  session_key: {type: String, default: ""}, 
  session_token: {type: String, default: ""}, 
  last_activity: {type: Date, default: Date.now}, 
	created_at: {type: Date, default: Date.now}
});

mongoose.model('User', User);
