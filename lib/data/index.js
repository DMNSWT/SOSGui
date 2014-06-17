module.exports = function(config){
	require('./DB')(config.database.fsLocation);
	return {
		User: require('./UserModel'),
		Dataset: require('./DatasetModel'),
		Playlist: require('./PlaylistModel')
	}
}