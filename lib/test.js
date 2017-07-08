const cluster = require("cluster");
const shm = require("../main.js").SharedMemory;

if(cluster.isMaster) {
	cluster.fork();
}
else {
	shm.set("/a/b",[],(err,res)=>{
		console.log(res);
		res.push(1);
		shm.set("/a/b",res,(err,res)=>{
			console.log(res);
		});
	});
}
