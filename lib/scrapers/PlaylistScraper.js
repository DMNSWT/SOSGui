var fs        = require('fs'),
	cp        = require('child_process'),
	async     = require('async'),
	chokidar  = require('chokidar');

module.exports = function(library, Playlist){
	console.log('spinning up playlist scraper');

	function indexPlaylist(path){
		if(path.endsWith('.sos')){
			fs.readFile(path, {encoding: 'utf8'}, function(e,filedata){
				if(e || !filedata || filedata.indexOf('include') < 0){
					return;
				}
				console.log('indexing playlist', path);
				var dss = filedata.split(/\n/gi);
				var plItems = new Array();
				for(var i=1, l= dss.length; i < l; i++){
					if(dss[i] == '' || !dss[i].indexOf('include') == 0){
						continue;
					}
					plItems.push(dss[i].replace('include = ', '').trim());
				}
				Playlist.new({
					_id: (path+'_'+i).toMD5(),
					fsLoc: path,
					items: plItems,
					addedByScraper: true
				}).save();
			});
		}
	}

	function unindexPlaylist(pl){
		if(path.endsWith('.sos')){
			console.log('unindexing', path);
			Playlist.find({fsLoc: path}, function(err, playlists){
				console.log(err, playlists);
				playlists.forEach(function(playlist){
					playlist.destroy(function(e){
						console.log('removed', playlist._id, e);
					});
				});
			});
		}
	}

	chokidar.watch(library)
		.on('add', indexPlaylist)
		.on('change', indexPlaylist)
		.on('unlink',unindexPlaylist)
		.on('error', function(error){
			console.error('Dataset Scraper Threw an Error ->', error);
		});
}