/**
 *  Topic schema
 **/
 
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

var Topic = new Schema({
	
	text: {type: String, index: true, unique: true, required: true}, 
	updated_at: {type: Date, default: Date.now},
	created_at: {type: Date, default: Date.now}
	
});

mongoose.model('Topic', Topic);
