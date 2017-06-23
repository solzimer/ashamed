const cluster = require('cluster');

if(cluster.isMaster) {
	module.exports = {
		SharedMemory : require('./lib/master.js'),
		Server : require('./lib/api.js')
	}
}
else {
	module.exports = {
		SharedMemory : require('./lib/worker.js'),
		Server : require('./lib/api.js')
	}
}
