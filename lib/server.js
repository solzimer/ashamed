const
	cluster = require('cluster'),
	os = require("os"),
	extend = require("extend");

if(cluster.isMaster) {
	const shm = require('./master.js');
	const DEF_CONF = {
		workers : "auto",
	}

	function start(options) {
			options = extend({},DEF_CONF,options);

			if(isNaN(options.workers) || options.workers<=0) {
				var wlen = Object.keys(cluster.workers).length;
				if(!wlen) {
					os.cpus().forEach(()=>cluster.fork());
				}
			}
			else {
				var wlen = parseInt(options.workers);
				for(let i=0;i<wlen;i++)
					cluster.fork();
			}
	}

	module.exports = {
		start : start
	}
}
else {
	const
		shm = require('./worker.js');
		express = require('express'),
		enableWs = require('express-ws'),
		bodyParser = require('body-parser'),
		cors = require('cors'),
		wshandler = require('./websocket.js');

	const DEF_CONF = {
		express : null,
		host : "0.0.0.0",
		port : 3000,
		context : ""
	}

	function start(options,callback) {
		callback = callback || function(){};
		options = extend({},DEF_CONF,options);
		var sa = options.express==null;
		var app = options.express || express();
		var ctx = options.context;

		enableWs(app);
		app.use(bodyParser.json());
		app.use(cors());

		app.get(`${ctx}/get/*`, (req,res)=>{
			var path = req.params[0];
			shm.get(path,{realtime:req.query.realtime},(err,data)=>{
				res.send(data);
			});
		});

		app.post(`${ctx}/put/*`, (req,res)=>{
			var path = req.params[0];
			shm.set(path,req.body,(err,data)=>{
				res.send(data);
			});
		});

		app.delete(`${ctx}/del/*`, (req,res)=>{
			var path = req.params[0];
			shm.del(path,(err,data)=>{
				res.send(data);
			});
		});

		app.get(`${ctx}/store`, (req,res)=>{
			res.send(shm.all());
		});

		app.ws(`${ctx}/ws`, (ws, res)=> {
			wshandler(ws);
		});

		if(sa) {
			app.listen(options.port,options.host, ()=>{
				callback(null,app);
			});
		}
	}

	module.exports = {
		start : start
	}
}
