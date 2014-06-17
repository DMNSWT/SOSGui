var connect   = require('connect'),
	stylus    = require('stylus'),
	nib       = require('nib'),
	quip      = require('quip'),
	dispatch  = require('dispatch'),
	swig      = require('swig'),
	async     = require('async'),
	sendmail  = require('sendmail');

function styl(str, path){
	return stylus(str)
		.set('filename', path)
		.set('compress', true)
		.use(nib())
		.import('nib');
}

function renderView(view, ctx){
	var tpl = swig.compileFile(__dirname+'/tpl/'+view+'.html');
	var out = tpl(ctx);
	return out;
}

module.exports = function(config, DB){
	
	swig.setDefaults({
		cache: false,
		varControls: ['{%=', "=%}"]
	});
	var app = connect(quip)
		.use(stylus.middleware({
			src: __dirname+ '/styl',
			dest: __dirname + '/../public',
			force: true,
			compile: styl
		}))
		.use(connect.favicon())
		.use(connect.static(__dirname + '/../public'))
		.use(function(req,res,next){
			req.ctx = {};
			next();
		})
		.use(connect.bodyParser())
		.use(connect.query())
		.use(dispatch({
			'/api':{
				'/users':     DB.User.dispatchHandler,
				'/playlists': DB.Playlist.dispatchHandler,
				'/datasets':  DB.Dataset.dispatchHandler,
				'/search': function(req,res,next){
					var tags = req.query.q.split(' ');
					async.series([
						function(cb){
							DB.Dataset.find({
								tags: function(v){
									return tags.indexOf(v) > -1;
								}
							}, cb);
						}
					], function(err, results){
						res.json(results.flatten());
					})
				}
			},
			'/manage':{
				'/playlists': function(req,res,next){
					res.ok(renderView('cms/managePlaylists', req.ctx))
				},
				'/datasets': function(req,res,next){
					res.ok(renderView('cms/manageDatasets', req.ctx))
				},
				'/users': function(req,res,next){
					res.ok(renderView('cms/manageUsers', req.ctx))
				}
			},
			'.+': function(req,res,next){
				res.ok(renderView('cms/index', req.ctx))
			}
		}))
		.listen(config.cmsInterface.server.port, config.cmsInterface.server.bind)
}