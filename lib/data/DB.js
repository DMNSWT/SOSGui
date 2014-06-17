var fs        = require('fs'),
	levelup   = require('levelup'),
	leveldown = require('leveldown'),
	LevelMult = require('level-multiply'),
	levelplus = require('levelplus'),
	sublevel  = require('level-sublevel');

var db;
module.exports = function(loc){
	if(db){
		return db;
	}
	else{
		db = sublevel(levelup(loc));
		db = levelplus(db);
		db = LevelMult(db, 'm');
		return db;
	}
}