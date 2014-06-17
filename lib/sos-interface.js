var net   = require('net'),
	async = require('async');

module.exports = function(config){
	var host         = config.sosTelnet.host || 'localhost',
		port         = config.sosTelnet.port || 2468;
		telnetClient = net.connect(port, host),
		helpers      = {
			playheadPos: function(cb){
				async.series([
					function(callback){
						attachTelnetCB(callback);
						cmd('get_frame_number');
					},
					function(callback){
						attachTelnetCB(callback);
						cmd('get_frame_count');
					}], function(err, frArr){
					var res = 0;
					if(frArr[0] !== 0 && frArr[1] !== 0){
						res = (frArr[0] / frArr[1])*100;
					}
					cb(null, res);
				})
			},
			clipInfo: function(clipId, cb){
				async.series([
					function(callback){
						// get clip name
						attachTelnetCB(callback);
						cmd('get_clip_info ' + clipId);
					},
					function(callback){
						// get clip catalog url
						attachTelnetCB(callback);
						cmd('get_clip_info ' + clipId + ' catalog_url');
					},
					function(callback){
						// get clip notes
						attachTelnetCB(callback);
						cmd('get_clip_info ' + clipId + ' PresentationNotes');
					},
					function(callback){
						// get clip layers
						attachTelnetCB(function(err, result){
							if(err){
								callback('Command Produced Error');
							}
							else{
								if(result == 'R'){
									callback(null, []);
								}
								else{
									var layerIds = [];
									for(var i=0; i<result; i++){
										layerIds.push(i);
									}
									async.mapSeries(layerIds, function(item, callb){
										attachTelnetCB(callb);
										cmd('get_clip_info ' + clipId + ',' + item + ' layer');
									}, function(err, results){
										callback(null, results)
									});
								}
							}
						});
						cmd('get_clip_info ' + clipId + ' layercount');
					}
				], function(err, infoArray){
					// transformation of information for actual output
					// modify this if you add more stuff
					var clipInfo = {
						id: clipId,
						title: infoArray[0],
						catalogURL: infoArray[1],
						presentationNotes: infoArray[2],
						children: infoArray[3]
					};
					cb(null, clipInfo);
				});
			}
		},
		telnetWorker = function(task, cb){

			if(task.cmd || typeof task == 'string'){
				telnetClient.once('sosError', function(){
					cb('Command Produced Error');
				});
				telnetClient.once('sosSuccess', function(result){
					cb(null, result);
				});
				cmd(typeof task == 'string'? task : task.cmd);
			}
			else if(task.helper && helpers[task.helper]){
				var args = task.args || [];
				args.push(cb);
				helpers[task.helper].apply(this, args);
			}
		},
		telnetReady = false;

	telnetClient.setMaxListeners(0);

	function cmd(cmdStr){
		telnetClient.write(cmdStr+'\r\n')
	}

	function attachTelnetCB(callback){
		telnetClient.once('sosError', function(){
			callback('Command Produced Error');
		});
		telnetClient.once('sosSuccess', function(result){
			callback(null, result);
		});
	}

	telnetClient.on('sosError', function(){
		console.log('an error occurred');
	});
	telnetClient.on('data', function(data){
		if(data.toString().indexOf('E0') === 0){
			// an error occurred
			telnetClient.emit('sosError');
		}
		else{
			telnetClient.emit('sosSuccess', data.toString().trim());
		}
	});

	telnetClient.on('end', function(){
		console.log('disconnected');
	});

	telnetClient.on('connect', function() { //'connect' listener
		telnetClient.setTimeout(0);
		telnetClient.setNoDelay(true);
		telnetClient.setKeepAlive(true);
		cmd('enable');
		telnetReady = true;
	});
	var workQueue = async.queue(telnetWorker, 1);  // single thread fifo queue
	function queuePush(task, cb){
		if(!telnetReady){
			setTimeout(function(){
				queuePush(task, cb);
			}, 1000);
		}
		else{
			workQueue.push(task, cb);
		}
	}
	return queuePush;
}