const
	readline = require('readline'),
	AshamedClient = require('./client.js');

function doReadLine(prefix,callback,autocallback) {
	var ic = prefix.length+1;
	var buffer = "";
	var cursor = 0;
	var history = [];

	readline.emitKeypressEvents(process.stdin);
	process.stdout.write(`${prefix} ${buffer}`);
	process.stdin.setRawMode(true);
	process.stdin.on('keypress', (str, key) => {
		//console.log(key);

		if(key.ctrl && key.name=="c") {
			console.log();
			process.exit(0);
		}
		else if(key.name=="return") {
			console.log();
			var command = buffer;
			buffer = "";
			cursor = 0;
			callback(command,()=>{
				process.stdout.write(`${prefix} ${buffer}`);
			});
		}
		else if(key.name=="backspace") {
			if(cursor<=0) return;
			process.stdout.clearLine();
	 		process.stdout.cursorTo(0);
			var str1 = buffer.substring(0,cursor-1);
			var str2 = buffer.substring(cursor);
			buffer = str1+str2;
			cursor = Math.max(0,--cursor);
			process.stdout.write(`${prefix} ${buffer}`);
			process.stdout.cursorTo(ic+cursor);
		}
		else if(key.name=="left") {
			cursor = Math.max(0,--cursor);
			process.stdout.cursorTo(ic+cursor);
		}
		else if(key.name=="right") {
			cursor = Math.min(buffer.length,++cursor);
			process.stdout.cursorTo(ic+cursor);
		}
		else {
			var str1 = buffer.substring(0,cursor);
			var str2 = buffer.substring(cursor);
			buffer = str1+str+str2;
			cursor++;
			process.stdout.clearLine();  // clear current text
	 		process.stdout.cursorTo(0);  // move cursor to beginning of line
			process.stdout.write(`${prefix} ${buffer}`);
			process.stdout.cursorTo(ic+cursor);  // move cursor to beginning of line
		}
	});
}

var client = new AshamedClient();
var store = {};

doReadLine("localhost:3000>",(line,done)=>{
	var args = line.split(" ");
	if(store[args[0]]) {
		console.log(JSON.stringify(store[args[0]],null,2));
		done();
	}
	else if(!client[args[0]]) {
		done();
	}
	else {
		client[args[0]](args[2]).then(data=>{
			store[args[1]] = data;
			console.log(JSON.stringify(data,null,2));
			done();
		});
	}
});
