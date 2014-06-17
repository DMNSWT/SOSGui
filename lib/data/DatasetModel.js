
// A single playable item for SOS

var Base = require('./BaseModel');

var Dataset = new Base('Dataset');

Dataset.getTagCloudData = function(cb){
	var index = this._index,
		tagCloud = {};
	index.createReadStream({start: ['tags', '\x00'], end: ['tags', '\xff']})
	.on('data', function(row){
		var tag = row.key.split(',')[1];
		tagCloud[tag] = row.value.length;
	})
	.on('end', function(){
		cb(tagCloud);
	})
}

Dataset.dispatchHandler._xtend({
	'/tags': function(req,res,next){
		Dataset.getTagCloudData(function(tc){
			res.ok().json(tc);
		})
	}
});

module.exports = Dataset;