const
	program = require("commander"),
	extend = require("extend"),
	vorpal = require('vorpal')(),
	Path = require('./path.js'),
	jsome = require('jsome'),
	DeepDiff = require('deep-diff'),
	AshamedClient = require('./client.js'),
	diff = DeepDiff.diff,
	applyDiff = DeepDiff.applyDiff,
	getPath = Path.getPath;

var store = {};
var client = null;
const DEF_CONF = {
	host : "localhost",
	port : 3000,
	base : "",
	auto : false
};

function initClient(conf) {
	client = new AshamedClient({
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

function pathAutoComplete(text,callback) {
	client.path(text).then(callback,err=>{
		callback([]);
	});
}

function startCli(conf,client) {
	vorpal
	  .command('get <path>', 'Retrieve the object stored on <path>')
		.alias('/get')
		.autocomplete(pathAutoComplete)
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
		.autocomplete(pathAutoComplete)
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
	  .command('path <path>', 'get keys under a path')
		.alias('/path')
		.autocomplete(pathAutoComplete)
	  .action(function(args, callback) {
			client.path(args.path).then(data=>{
				this.log(jsome.getColoredString(data));
				callback();
			},err=>{
				this.log(err);
				callback();
			});
	  });

	vorpal
		.command('print <path>', 'Prints <path>')
		.alias('/print')
		.autocomplete(pathAutoComplete)
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
			var db = extend(true,{},store);
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
			}catch(err) {
				this.log(err);
			}

			var ndiff = diff(store,db);
			if(conf.auto && ndiff && ndiff.length) {
				client.diff(ndiff).fin(()=>{
					callback();
				});
			}
			else {
				applyDiff(store,db);
				callback();
			}
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
	.option('-a, --auto', 'Auto upload local changes')
  .parse(process.argv);

var conf = extend(DEF_CONF,program);
initClient(conf)
