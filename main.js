const cluster = require('cluster');

if(cluster.isMaster) {
	module.exports = require('./lib/master.js');
}
else {
	module.exports = require('./lib/worker.js');
}
