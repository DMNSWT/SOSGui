module.exports = function(config, DB){
	return{
		dataset: require('./DatasetScraper')(config.cmsInterface.library, DB.Dataset),
		playlist: require('./PlaylistScraper')(config.cmsInterface.library, DB.Playlist)
	}
}