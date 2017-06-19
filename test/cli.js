const
	cluster = require('cluster'),
	express = require('express'),
	bodyParser = require('body-parser'),
	os = require("os"),
	shm = require('../main.js');

if(cluster.isMaster) {
	os.cpus().forEach(cpu=>cluster.fork());
}
else {
	const app = express();

	app.use(bodyParser.json());

	app.get('/shm/*', (req,res)=>{
		var path = req.params[0];
		shm.get(path,false,(err,data)=>{
			res.send(data);
		});
	});

	app.post('/shm/*', (req,res)=>{
		var path = req.params[0];
		shm.set(path,req.body,(err,data)=>{
			res.send(data);
		});
	});

	app.listen(3000, function () {
	  console.log('Worker listening on port 3000!')
	});

}
