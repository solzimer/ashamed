const
	cluster = require('cluster'),
	os = require("os"),
	shm = require('../main.js');

if(cluster.isMaster) {
	os.cpus().forEach(cpu=>cluster.fork());
}
else {
	const
		express = require('express'),
		enableWs = require('express-ws'),
		bodyParser = require('body-parser');

	const app = express();

	enableWs(app);
	app.use(bodyParser.json());

	app.get('/shm/*', (req,res)=>{
		var path = req.params[0];
		shm.get(path,{realtime:req.query.realtime},(err,data)=>{
			res.send(data);
		});
	});

	app.post('/shm/*', (req,res)=>{
		var path = req.params[0];
		shm.set(path,req.body,(err,data)=>{
			res.send(data);
		});
	});

	app.get('/store', (req,res)=>{
		res.send(shm.all());
	});

	app.ws('/shm', (ws, res)=> {

	});

	app.listen(3000, function () {
	  console.log('Worker listening on port 3000!')
	});
}
