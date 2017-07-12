var extend = require("extend");
var master = require("../lib/master.js");
var diff = require("../lib/path.js").diff;

const path = "/app/data";

function set() {
	master.set(path,{items:[1,2,3,4]},add);
}

function get(cb) {
	master.get(path,cb);
}

function add(err,data) {
	console.log("Initial data",data);

	var back = extend(true,{},data);
	back.items.push(100);
	var patch = diff(data,back);
	update(0,patch);
}

function update(i,patch) {
	if(i>4) get(end);
	else {
		master.diff(path,patch,(err,changes)=>{
			console.log(`Applied ${changes.length} changes`);
			update(i+1,patch);
		});
	}
}

function end(err,data) {
	console.log("END!",data,err);
}

set();
