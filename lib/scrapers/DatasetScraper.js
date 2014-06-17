var fs        = require('fs'),
	cp        = require('child_process'),
	async     = require('async'),
	chokidar  = require('chokidar'),
	iniparser = require('iniparser');

module.exports = function(library, Dataset){
	console.log('spinning up dataset scraper');

	function unindexDataset(path){
		if(path.endsWith('.sos')){
			console.log('unindexing', path);
			Dataset.find({fsLoc: path}, function(err, datasets){
				console.log(err, datasets);
				datasets.forEach(function(dataset){
					dataset.destroy(function(e){
						console.log('removed', dataset._id, e);
					});
				});
			});
		}
	}

	function indexDataset(path){
		if(path.endsWith('.sos')){
			fs.readFile(path, {encoding: 'utf8'}, function(e,filedata){
				if(e || !filedata || filedata.indexOf('name') < 0){
					return;
				}
				console.log('indexing', path);
				var dss = filedata.split(/name\s*\=/gi);
				for(var i=1, l= dss.length; i < l; i++){
					if(dss[i] == ''){
						continue;
					}
					var ds = iniparser.parseString('name =' + dss[i]);
					var tags = ds.category? ds.category.split(',') : [];
					tags.forEach(function(tag, indx){
						tags[indx] = tag.trim();
					});
					Dataset.new({
						_id: (path+'_'+i).toMD5(),
						fsLoc: path,
						name: ds.name? ds.name : '',
						tags: tags,
						description: ds.description? ds.description : ''
					}).save();
				}
			});
		}
	}

	chokidar.watch(library)
		.on('add', indexDataset)
		.on('change', indexDataset)
		.on('unlink',unindexDataset)
		.on('error', function(error){
			console.error('Dataset Scraper Threw an Error ->', error);
		});
}