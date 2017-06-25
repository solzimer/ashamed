const
	vorpal = require('vorpal')(),
	AshamedClient = require('./client.js');

var client = new AshamedClient();
var store = {};

vorpal
  .command('get <var> <path>', 'Assign to variable <var> the object on <path>')
	.alias('/get')
  .action(function(args, callback) {
    client.get(args.path).then(data=>{
			store[args.var] = data;
			this.log(JSON.stringify(data,null,2));
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
		if(store[args.var]) {this.log(JSON.stringify(store[args.var],null,2));}
		else {this.log(`Variable ${args.var} doesn't exist!`);}
		callback();
	});

vorpal
	.command('/ [expression...]', 'Evaluate the javascript expression')
  .action(function(args, callback) {
		if(args.expression.length==1) {
			var v = args.expression[0];
			if(store[v]) {this.log(JSON.stringify(store[v],null,2));}
			else {this.log(`Variable ${v} doesn't exist!`);}
		}
		else {
			try {
				var print = (data)=>{this.log(JSON.stringify(data,null,2))};
				var keys = Object.keys(store).map(k=>`var ${k}=store.${k};`).join("\n");
				var res = Function("store","print",keys+'return '+args.expression.join(" "));
				this.log(res(store,print));
			}catch(err) {
				this.log(err);
			}
		}
		callback();
  });

vorpal
  .delimiter('localhost:3000>')
  .show();
