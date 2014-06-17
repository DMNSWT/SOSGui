// neverdie
process.on('uncaughtException', function(err){
	console.log('uncaughtException', new Date(), 'Caught exception: ' + err);
});

require('./lib/native-x');

var defaultConfig = {
	sosTelnet:{
		host: "127.0.0.1",
		port: 2468
	},
	controlInterface:{
		server:{
			port: 3500
		}
	},
	cmsInterface:{
		server:{
			bind: '0.0.0.0',
			port: 3510
		},
		library:[
			'/shared'
		],
		playlistFsLocation: __dirname + '/../ml-sos-cms-data/playlists'
	},
	database:{
		fsLocation: __dirname + '/../ml-sos-cms-data/database'
	}
}
var loadedConfig;
try{
	loadedConfig = require(__dirname+'/config');
} catch(e){
	console.log('************************************************************');
	console.log('missing config.json, please add it, continuing with defaults');
	console.log('************************************************************')
	loadedConfig = {};
}
//load config or default config
var config = {}._xtend(defaultConfig, loadedConfig);

console.log(config);

// start database
var DB = require(__dirname+ '/lib/data')(config);

// start control interface
var controlInterface = require(__dirname+'/lib/control-interface')(config);

// start CMS interface
var cmsInterface = require(__dirname+'/lib/cms-interface')(config, DB);

// scrape FS for datasets and playlists
var scrapers = require(__dirname+'/lib/scrapers')(config, DB);