var http = require('http'),
	https = require('https'),
	fs = require('fs');

var URLRegex = /^(https|https)/gi


module.exports = function(src, cb){
	cb = cb || function(){}
	// try it as a URL
	if(src.match(URLRegex)){
		var getBy = http;
		if(src.indexOf('https') === 0){
			getBy = https;
		}
		getBy.get(src, function(res){
			var respBody = '';
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				respBody += chunk;
			});
			res.on('end', function(){
				cb(respBody); // reutnr contents of webpage
			})
		})
	}
	else{
		// try it via fs
		fs.readFile(src, function(err, data){
			if(err || !data){
				cb(src); // return original request string
			}
			else{
				cb(data); // return contents of file
			}
		});
	}
}