var bytewise = require('bytewise');

module.exports = {
	encode: bytewise.encode.bind(bytewise),
	decode: bytewise.decode.bind(bytewise),
	buffer: true,
	type: 'bytewise'
}