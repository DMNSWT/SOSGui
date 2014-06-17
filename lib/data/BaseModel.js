var uuid           = require('node-uuid'),
	async          = require('async'),
	LevelMultiply  = require('level-multiply'),
	bytewiseEncode = require('../bytewise-encoding')
	DB             = require('./DB')();

function mkFunctionFromMongolike(ml){
	// should implement $gt, $gte, $lt, $lte, $in, $nin, $ne
	return function(v){
		var matches = false;
		if(ml.$gt){
			matches = parseInt(v) > parseInt(ml.$gt);
		}
		if(ml.$gte){
			matches = parseInt(v) >= parseInt(ml.$gte);
		}
		if(ml.$lt){
			matches = parseInt(v) < parseInt(ml.$lt);
		}
		if(ml.$lte){
			matches = parseInt(v) <= parseInt(ml.$lte);
		}
		if(ml.$in && ml.$in instanceof Array){
			matches = ml.$in.indexOf(v) > -1;
		}
		if(ml.$nin && ml.$nin instanceof Array){
			matches = ml.$nin.indexOf(v) == -1;
		}
		if(ml.$ne){
			matches = v != ml.$ne;
		}
		return matches;
	}
}

function Matcher(opts){
	// setup reserved keywords for matcher here
	// delete them when done

	this.indexKeys = new Array();
	this.regexKeys = new Array();
	for( var k in opts){
		var matchable = opts[k];
		if(matchable instanceof RegExp){
			this.regexKeys.push({property: k, matchWith: matchable});
		}
		else if(matchable instanceof Function){
			this.regexKeys.push({property: k, filter: matchable});
		}
		else if(matchable instanceof Object){
			this.regexKeys.push({property: k, filter: mkFunctionFromMongolike(matchable)});
		}
		else{ // assume "equals" string match
			this.indexKeys.push([k, matchable]);
		}
	}
	return this;
}

var utils = {
	union: function(){
		return utils.flatten.apply(utils, arguments).uniq();
	},
	intersect: function(){
		var args = arguments.length,
			res = new Array(),
			hits = new Object(),
			arr = utils.flatten.apply(utils, arguments);
		arr.forEach(function(v){
			if(hits[v]){ hits[v] += 1; }
			else{ hits[v] = 1; }
			if(hits[v] >= args){ res.push(v); }
		});
		return res;

	},
	flatten: function(){
		return [].concat.apply([],arguments);
	},
	noop: function(){},
	tryBool: function(v){
		if(v.match(/true/gi)){ return true; }
		else if(v.match(/false/gi)){ return false; }
		else{ return v; }
	}
}

function noop(){}

function Model(db, index){
	var self = this;
	self._db = db;
	self._index = index;

	function createParallelFindTask(m){
		return function(icb){
			var results = new Array();
			index
				.createReadStream({start: [m.property, (m.eq? m.eq : '\x00')], end: [m.property, (m.eq? m.eq : '\xff')]})
				.on('data', function(d){
					var kv = utils.tryBool(d.key.replace(m.property+',', ''));
					if(m.eq){
						d.value.forEach(function(av){
							results.push(av);
						});
					}
					else if(m.matchWith){
						// see if index value matches t.matchWith (str.match(m.matchWith))
						if(kv.match(m.matchWith)){
							d.value.forEach(function(av){
								results.push(av);
							});
						}
					}
					else if(m.filter){
						if(m.filter(kv)){
							d.value.forEach(function(av){
								results.push(av);
							});
						}
					}
					
				})
				.on('error', function(e){
					console.log('error', e);
					icb(e, null);
				})
				.on('end', function(){
					icb(null, results);
				})
		}
	}





	// Model.iModel() // creates a model instance, overridable
	this.iModel = function(key, data){
		data = data || {};
		if(!key && data._id){
			key = data._id;
		}
		data._id = key;
		// model.update()
		data.priv('update', function(addUp, cb){
			cb = cb || noop;
			var oData = data;
			data._xtend(addUp);
			db.put(data._id, data, function(e){
				cb(e, (e? oData : data));
			});
		});

		// model.create()
		data.priv('create', function(cb){
			cb = cb || noop;
			if(!data._id){
				var newKey = self.createKey(data);				
				data = self.iModel(newKey, data);
			}
			db.put(data._id, data, function(e){
				cb(e, data);
			});
		});

		// model.save() // shortcut for save || update
		data.priv('save', function(cb){
			if(data._id){
				data.update({}, cb);
			}
			else{
				data.create(cb);
			}
		});

		// model.destroy()
		data.priv('destroy', function(cb){
			cb = cb || noop;
			db.del(data._id, cb);
		});

		return data;
	}
	// Model.new()
	this.validate = function(id, obj, cb){
		var errs = false;
		if(id && obj._id && id != obj._id){
			errs = 'wrong object';
		}
		cb(errs);
	};
	this.createKey = function(data){
		return uuid.v4();
	}
	this.new = function(data){
		return self.iModel(data._id, data);
	}
	// Model.all()
	this.all = function(cb){
		cb = cb || noop;
		var rstream = db.createReadStream();
		var results = [];
		rstream.on('data', function(data){
			results.push(self.iModel(data.key, data.value));
		}).on('error', function(e){
			cb(e);
		}).on('end', function(){
			cb(null, results);
		});
	}
	// Model.get()
	this.get = function(key, cb){
		cb = cb || noop;
		db.get(key, function(err, value){
			if(value){
				value = self.iModel(key, value);
			}
			cb(err, value)
		});
	}
	this.getIndex = function(cb){
		cb = cb || noop;
		var rstream = index.createReadStream();
		var results = [];
		rstream.on('data', function(data){
			results.push(self.iModel(data.key, data.value));
		}).on('error', function(e){
			cb(e);
		}).on('end', function(){
			cb(null, results);
		});
	}
	// Model.find()
	this.find = function(m, cb){
		cb = cb || noop;
		var matcher = new Matcher(m);
		if(matcher.regexKeys.length < 1){
			index.mget(matcher.indexKeys, function(err, docs){
				var allKeys = new Array();
				for(var k in docs){
					allKeys.push(docs[k]);
				}
				var keys = utils.intersect.apply(utils, allKeys);
				db.mget(keys, function(err, results){
					var instResults = new Array();
					for(var k in results){
						instResults.push( self.iModel(k, results[k]) )
					}
					cb(err, instResults);
				});
			});
		}
		else{
			var tasks = new Array();
			for(var rk=0, l=matcher.regexKeys.length; rk<l; rk++){
				var t = matcher.regexKeys[rk];
				tasks.push(createParallelFindTask(t));
			}
			for(var rk=0, l=matcher.indexKeys.length; rk<l; rk++){
				var t = matcher.indexKeys[rk];
				tasks.push(createParallelFindTask({property: t[0], eq: t[1]}));
			}
			async.parallel(tasks, function(error, docs){
				var allKeys = new Array();
				for(var k in docs){
					allKeys.push(docs[k]);
				}
				var keys = utils.intersect.apply(utils, allKeys);
				db.mget(keys, function(err, results){
					var instResults = new Array();
					for(var k in results){
						instResults.push( self.iModel(k, results[k]) )
					}
					cb(err, instResults);
				});
			});
		}
	}

	var indexingQueue = async.queue(function(task, cb) {
		task(cb);
	}, 1);

	this.addKeyToIndex = function(ind, key){
		indexingQueue.push(function(cb){
			index.get(ind, function(err, result){
				if(result){
					result.push(key);
					result = result.uniq();
				}
				else{
					result = [key];
				}
				index.put(ind, result, function(){
					cb();
				});
			}, noop);
		});
		
	}

	this.indexDocument = function(values, key){
		var indexables = values.createIndex();
		var batch = new Array();
		for(var i in indexables){
			var k = indexables[i];
			this.addKeyToIndex(k, key);
		}
	}
	this.unindexDocument = function(id){
		var rstream = index.createReadStream();
		var batch = [];
		rstream.on('data', function(data){
			if(data.value.indexOf(id) > -1){
				data.value.remove(id);
				batch.push({
					key: data.key,
					value: data.value,
					type: 'put'
				});
			}
		}).on('end', function(){
			index.batch(batch);
		});
	}
	this.dispatchHandler = {
		'/count': function(req,res,next){
			self.all(function(err, results){
				res.ok(results.length+'');
			});
		},
		'/byId/:id': {
			'GET': function(req,res,next,id){
				self.get(id, function(err, result){
					res.json(result);
				});
			},
			'PUT': function(req,res,next,id){
				// add update here later
				console.log(id, 'hit');
				self.validate(id, req.body, function(errs){
					if(errs){
						res.error().json(errs);
					}
					self.get(id, function(err, result){
						result._xtend(req.body).save(function(err){
							res.json(result);
						});
					});
				});
			},
			'DELETE': function(req,res,next,id){

			}
		},
		'POST': function(req,res,next){
			self.validate(false, req.body, function(errs){
				if(errs){
					res.error().json(errs);
				}
				self.new(req.body).save(function(e, newObj){
					res.json(newObj);
				});
			});
		},
		'GET': function(req,res,next){
			self.all(function(err, results){
				res.json(results);
			});
		}
	}

	return this;
}
module.exports = function(name){
	if(!name){
		return;
	}
	// each model is going to get it's own sublevel and index
	var modelDB = DB.sublevel(name, {
		valueEncoding: 'json'
	}),
	modelIndex = modelDB.sublevel('__index', {
		keyEncoding: bytewiseEncode,
		valueEncoding: 'json'
	});
	modelDB    = LevelMultiply(modelDB, 'm');
	modelIndex = LevelMultiply(modelIndex, 'm');

	var theModel = new Model(modelDB, modelIndex);

	modelDB.pre(function(ch, add){
		switch(ch.type){
			case 'put': // on put, index or re-index the object
				if(ch.value && ch.key && ch.value instanceof Object){
					theModel.indexDocument(ch.value, ch.key);
				}
				break;
			case 'del': // on delete, unindex the object
				if(ch.key){
					theModel.unindexDocument(ch.key)
				}
				break;
		}
	});

	return theModel;
	// Meta helper methods

	// Model._index()

	// Model._unindex()
}