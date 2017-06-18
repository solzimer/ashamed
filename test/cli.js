const cluster = require('cluster');
const shm = require('../main.js');

if(cluster.isMaster) {
	cluster.fork();
	setInterval(()=>{
		shm.get("path/to/key",(err,res)=>{
			if(err) console.log(err);
			else console.log(res);
		});
	},1000);
}
else {
	var i=0;
	setInterval(()=>{
		var data = {key : "mykey", val : `myval_${i++}`};
		shm.set("path/to/key",data,(err,res)=>{
			if(err) console.error("From worker",err);
		})
	},100);
}
