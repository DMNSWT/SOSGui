var connect   = require('connect'),
	stylus    = require('stylus'),
	nib       = require('nib'),
	quip      = require('quip'),
	dispatch  = require('dispatch'),
	swig      = require('swig'),
	multiload = require('./multiload'),
	sendmail  = require('sendmail'),
	async     = require('async');

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

module.exports = function(config){
	swig.setDefaults({
		cache: false,
		varControls: ['{%=', "=%}"]
	});

	var SOS    = require(__dirname+'/sos-interface')(config),
		server = connect(quip)
			.use(stylus.middleware({
				src: __dirname+ '/styl',
				dest: __dirname + '/../public',
				force: true,
				compile: styl
			}))
			.use(connect.favicon())
			.use(connect.static(__dirname + '/../public'))
			.use(connect.logger())
			.use(function(req,res,next){
				req.ctxs = {};
				next();
			})
			.use(dispatch({
				'/playlists': function(req,res,next){
					SOS('get_playlist_names_in_directory', function(err, playlists){
						if(err){ console.log(err); }
						var playlistsArray = playlists.split("\\s+");
						res.json(playlistsArray);
					});
				},
				'/get-notes/:clipId': function(req,res,next, clipId){
					SOS('get_clip_info ' + clipId + ' PresentationNotes', function(err, notes){
						multiload(notes, function(actualNotes){
							res.html(actualNotes);
						});
					});
				},
				'/mail-link/:email/:clipId': function(req,res,next,email,clipId){
					SOS({helper: 'clipInfo', args:[clipId]}, function(err, clipInfo){
						sendmail({
              from: 'no-reply@thesphere.com',
              to: email,
              subject: 'Link to '+clipInfo.title,
              content: clipInfo.catalogURL,
            }, console.log);
					});
					res.ok(' ');
				},
				'/get-playlist-items': function(req,res,next){
					SOS('get_clip_count', function(err, count){
						if(err){
							res.error().json({msg: 'An Error Occurred'});
						}
						else{
							var clipids = [];
							for(var i=1; i <= count; i++){
								clipids.push(i+'');
							}
							async.mapSeries(clipids, function(id, cb){
								SOS({helper: 'clipInfo', args:[id]}, cb);
							}, function(errs, results){
								res.ok().json(results);
							});
						}
					});
				},
				'/virtual-globe': function(req,res,next){
					res.ok( renderView('virtual-globe', req.ctx) );
				},
				'/v4': function(req,res,next){
					res.ok( renderView('presenter-v4', req.ctx) );
				},
				'/v5': function(req,res,next){
					res.ok( renderView('presenter-v5', req.ctx) );
				},
				'/': function(req,res,next){
					res.ok( renderView('presenter-v3', req.ctx) );
				},
				'.+': function(req,res,next){
					res.notFound('404 - Not Found');
				}
			}))
			.listen(config.controlInterface.server.port),
		io = require('socket.io').listen(server);

	io.enable('browser client minification');
	io.enable('browser client etag');
	io.enable('browser client gzip');
	io.set('log level', 1);

	io.sockets.on('connection', function (socket){
		socket.on('passthrough', function(cmd){
			console.log(cmd);
			SOS(cmd, function(err, result){
				if(err){
					console.log(err, 'error executing passthrough for', cmd)
				}
			});
		});

		socket.on('play', function(o){
			// o.mediaId is the id of the user selected media
			if(o && o.mediaId){
				var id = o.mediaId;
				currentMedia = id;
				SOS('play ' + id);
			}
		});
		socket.on('play-current', function(){
			SOS('play');
		});
		socket.on('pause-current', function(){
			SOS('pause');
		});

		socket.on('scrub-to', function(pct){
			SOS('get_frame_count', function(err, count){
				var frame = Math.floor((pct/100)*count)
				SOS('skip ' + frame, function(e,r){
					SOS('play');
				});
			})
		});

		setInterval(function(){
			SOS({helper: 'playheadPos', args:[]}, function(err, pos){
				socket.emit('playhead-update', pos);
			});
		}, 500)


	});
}
