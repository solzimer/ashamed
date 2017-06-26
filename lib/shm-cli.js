const
	program = require("commander"),
	extend = require("extend"),
	vorpal = require('vorpal')(),
	Path = require('./path.js'),
	jsome = require('jsome'),
	DeepDiff = require('deep-diff'),
	AshamedClient = require('./client.js'),
	diff = DeepDiff.diff,
	getPath = Path.getPath;

var store = {};
const DEF_CONF = {
	host : "localhost",
	port : 3000,
	base : ""
};

function initClient(conf) {
	var client = new AshamedClient({
		host : `${conf.host}:${conf.port}`,
		base : `${conf.base}`
	});
	client.on("error",err=>{
		console.error(err);
	});
	client.once("ready",()=>{
		store = client.store;
		startCli(conf,client);
	});
	client.on("close",()=>{
		console.error("Connection has been closed... trying reconnection...");
		setTimeout(()=>client.connect(),5000);
	});
}

function startCli(conf,client) {
	vorpal
	  .command('get <path>', 'Retrieve the object stored on <path>')
		.alias('/get')
	  .action(function(args, callback) {
	    client.get(args.path).then(data=>{
				getPath(args.path,true,store,data);
				this.log(jsome.getColoredString(data));
				callback();
			},err=>{
				this.log(err);
				callback();
			});
	  });

	vorpal
	  .command('set <path>', 'Commits changes to <path>')
		.alias('/set')
	  .action(function(args, callback) {
			var item = getPath(args.path,false,store);
			if(item===undefined) {
				this.log(`Path ${args.path} doesn't exist`);
				callback();
			}
			else {
				client.set(args.path,item).then(data=>{
					getPath(args.path,true,store,data);
					this.log(jsome.getColoredString(data));
					callback();
				},err=>{
					this.log(err);
					callback();
				});
			}
	  });

	vorpal
		.command('print <path>', 'Prints <path>')
		.alias('/print')
		.action(function(args, callback) {
			var res = getPath(args.path,false,store);
			if(res!==undefined) {this.log(jsome.getColoredString(res));}
			else {this.log(`Path ${args.path} doesn't exist!`);}
			callback();
		});

	vorpal
	  .mode('/')
	  .description('Enters the user into a REPL session.')
	  .delimiter(`[repl]`)
	  .action(function(command, callback) {
			try {
				var res = eval(command);
		    this.log(jsome.getColoredString(res));
			}catch(err) {
				this.log(err);
			}
			callback();
	  });

	vorpal
	  .catch('[words...]', 'Catches incorrect commands')
		.parse(function (command, args) {
			var cmd = new Buffer(command).toString('base64')
			return `eval ${cmd}`;
  	})
	  .action(function (args, callback) {
			var db = extend(true,{},store);
			var cmd = new Buffer(args.words[1],'base64').toString('ascii');
			try {
				var res = eval(cmd);
		    this.log(res!==undefined? jsome.getColoredString(res) : res);
				this.log(diff(store,db));
			}catch(err) {
				this.log(err);
			}
			callback();
	  });

	vorpal
		.delimiter(`${conf.host}:${conf.port}>`)
		.show();
}

program.version('0.0.1')
  .option('-h, --host [host]', 'Ashamed host (default localhost)')
  .option('-p, --port [port]', 'Ashamed port (default 3000)',parseInt)
	.option('-b, --base [uri]', 'Ashamed server base uri (default /)')
	.option('-s, --standalone', 'Run a local server')
  .parse(process.argv);

var conf = extend(DEF_CONF,program);
initClient(conf)
