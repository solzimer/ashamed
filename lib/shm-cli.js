const
	program = require("commander"),
	extend = require("extend"),
	vorpal = require('vorpal')(),
	Path = require('./path.js'),
	jsome = require('jsome'),
	AshamedClient = require('./client.js'),
	AshamedServer = require('./server.js'),
	getPath = Path.getPath;

const store = {};
const DEF_CONF = {
	host : "localhost",
	port : 3000,
	base : ""
};

function initClient(conf,callback) {
	var client = new AshamedClient({
		host : `${conf.host}:${conf.port}`,
		base : `${conf.base}`
	});
	client.on("error",err=>callback(err));
	client.on("ready",()=>callback(null,client));
}

function startCli(conf,client) {
	vorpal
	  .command('get <var> <path>', 'Assign to variable <var> the object stored on <path>')
		.alias('/get')
	  .action(function(args, callback) {
	    client.get(args.path).then(data=>{
				var path = "/" + args.var.split(".").join("/");
				getPath(path,true,store,data);
				this.log(jsome.getColoredString(data));
				callback();
			},err=>{
				this.log(err);
				callback();
			});
	  });

	vorpal
		.command('print <var>', 'Prints variable <var>')
		.alias('/print')
		.action(function(args, callback) {
			var path = "/" + args.var.split(".").join("/");
			var res = getPath(path,false,store);
			if(res) {this.log(jsome.getColoredString(res));}
			else {this.log(`Variable ${args.var} doesn't exist!`);}
			callback();
		});

	vorpal
		.command('/ [expression...]', 'Evaluate the javascript expression')
	  .action(function(args, callback) {
			try {
				var print = (data)=>{this.log(JSON.stringify(data,null,2))};
				var keys = Object.keys(store).map(k=>`var ${k}=store.${k};`).join("\n");
				var fn = Function("store","print",keys+'return '+args.expression.join(" "));
				var res = fn(store,print);
				this.log(jsome.getColoredString(res));
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
initClient(conf,(err,client)=>{
	startCli(conf,client);
});
