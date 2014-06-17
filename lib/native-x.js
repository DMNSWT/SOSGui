/*
	This file contains enhancements to the base or native JavaScript objects.
	This is loaded first by the root of the nerdcan module and should be,
	available everywhere after that
*/
var crypto = require('crypto');

// Object.priv(key, value)
// use this to add non-enumerable properties of any kind to an object
// this is used internally for other non-enumerable properties
Object.defineProperty(Object.prototype, 'priv', {
	enumerable: false,
	value: function(k,v){
		if(!this.hasOwnProperty(k)){
			Object.defineProperty(this, k, {
				enumerable: false,
				value: v
			});
		}
		return this;
	}
});

//Object._xtend([obj1], [obj2], ...)
Object.prototype.priv('_xtend', function(){
	for(var i=0, l=arguments.length; i<l; i++){
		var addOn = arguments[i];
		if(addOn instanceof Object){
			for(var p in addOn){
				if(this[p] && this[p] instanceof Object &&
					addOn[p] instanceof Object
				){
					this[p]._xtend(addOn[p]);
				} else {
					if(addOn[p] === 'true'){
						this[p] = true;
					} else if(addOn[p] === 'false'){
						this[p] = false;
					} else {
						this[p] = addOn[p];
					}
					
				}
			}
		}
	}
	return this;
});

//Object.createIndex()
Object.prototype.priv('createIndex', function(prefix){
	prefix = prefix || '';
	var indexables = new Array();
	for(var p in this){
		if(p == '_id'){ continue; }
		var prop = prefix+p;
		if(this[p] instanceof Array){
			var vals = this[p];
			for(var i=0; i<vals.length; i++){
				var theVal = vals[i];
				if(typeof theVal == 'string'){
					theVal = theVal.trim();
				}
				indexables.push([prop, theVal]);
			}
		}
		else if(this[p] instanceof Object){
			indexables.push.apply( indexables, this[p].createIndex(prop+'.') );
		}
		else if(typeof this[p] == 'string'){
			var vals = this[p].split(/\s/);
			for(var i=0; i<vals.length; i++){
				indexables.push([prop, vals[i]]);
			}
		}
		else if(!this[p] instanceof Function){
			indexables.push([prop, this[p]]);
		}
	}
	return indexables;
})

// Array.contains(thing)
Array.prototype.priv('contains', function(thing){
	for(var i=0, l=this.length; i<l; i++){
		if(this[i] == thing){ return true; }
		if(this[i].toString && thing.toString &&
			this[i].toString() == thing.toString()
		){ return true; }
	}
	return false;
});

// Array.remove(thing)
Array.prototype.priv('remove', function(thing){
	if(this.indexOf(thing)){
		this.splice(this.indexOf(thing), 1);
	}
})

// Array.uniq() // make array only contain unique values
Array.prototype.priv('uniq', function(){
	var results = [];
	var seen = [];
	this.forEach(function(v){
		if(seen.indexOf(v) < 0){
			seen.push(v);
			results.push(v);
		}
	});
	return results;
})

// Aray.flatten() //concats an arrya of arrays
Array.prototype.priv('flatten', function(){
	return Array.prototype.concat.apply([], this);
})

// String.capitalize()
String.prototype.priv('capitalize', function(){
	var wordArr = this.split(' ');
	for(var i=0; i<wordArr.length; i++){
		wordArr[i] = wordArr[i].replace(/^\w/, function($0) { return $0.toUpperCase(); });
	}
	return wordArr.join(' ');
});

// String.toMD5()
String.prototype.priv('toMD5', function(){
	return crypto
        .createHash('md5')
        .update(this.toString())
        .digest('hex');
});

// String.trim()
String.prototype.priv('trim', function(){
	return this.replace(/^\s+|\s+$/g, '');
});

// String.toSlug()
String.prototype.priv('toSlug', function(){
	var str = this.trim().toLowerCase();

	// remove accents, swap ñ for n, etc
	var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
	var to   = "aaaaeeeeiiiioooouuuunc------";
	for (var i=0, l=from.length ; i<l ; i++) {
	str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
	}

	str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
	.replace(/\s+/g, '-') // collapse whitespace and replace by -
	.replace(/-+/g, '-'); // collapse dashes

	return str;
});

// String.rand (create a random string of letters)
String.priv('rand', function(len){
	len = len || 8;
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var str = '';
	for(var i=0; i<len; i++){
		var rnum = Math.floor(Math.random() * chars.length);
		str += chars.substring(rnum, rnum+1);
	}
	return str;
});

// String.endsWith(suffix)
String.prototype.priv('endsWith', function(suffix){
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
});
// String.startsWith(prefix)
String.prototype.priv('startsWith', function(prefix){
	return this.indexOf(prefix) === 0;
});

// String.isEmail() returns bool true if string is email
String.prototype.priv('isEmail', function(){
	var emailRegex = /^([a-zA-Z0-9])(([a-zA-Z0-9])*([\._\+-])*([a-zA-Z0-9]))*@(([a-zA-Z0-9\-])+(\.))+([a-zA-Z]{2,4})+$/;
	return emailRegex.test(this);
})

// Number.toRad(), convert number to radians
Number.prototype.priv('toRad', function(){
	return this * Math.PI / 180;
});
