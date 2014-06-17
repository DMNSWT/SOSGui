var Base = require('./BaseModel');

var User = new Base('User');

var oCreateKey = User.createKey;

User.createKey = function(data){
	if(data.email){
		return data.email;
	}
	else{
		return oCreateKey();
	}
}

module.exports = User;