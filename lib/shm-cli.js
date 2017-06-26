const
	vorpal = require('vorpal')(),
	jsome = require('jsome'),
	AshamedClient = require('./client.js');

var client = new AshamedClient();
var store = {};

vorpal
  .command('get <var> <path>', 'Assign to variable <var> the object on <path>')
	.alias('/get')
  .action(function(args, callback) {
    client.get(args.path).then(data=>{
			store[args.var] = data;
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
		var res = store[args.var];
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
  .delimiter('localhost:3000>')
  .show();
