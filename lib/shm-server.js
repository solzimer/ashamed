const
	program = require("commander"),
	extend = require("extend"),
	Ashamed = require("../main.js"),
	Server = Ashamed.Server;

const DEF_CONF = {
	host : "localhost",
	port : 3000,
	context : "",
	workers : "auto"
};

program.version('0.0.1')
  .option('-h, --host [host]', 'Ashamed host (default localhost)')
  .option('-p, --port [port]', 'Ashamed port (default 3000)',parseInt)
	.option('-c, --context [uri]', 'Ashamed server base context (default /)')
	.option('-w, --workers [workers]', 'Worker processes (default auto)')
  .parse(process.argv);

var conf = extend(DEF_CONF,program);
Server.start(conf,()=>{
	console.log(`Worker listening on ${conf.host}:${conf.port}!`);
});
