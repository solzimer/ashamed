const jiff = require("jiff");

var store = {};

var change = [{op:"add",path:"a/b/c", val:[1,2,3,4]}];

jiff.patchInPlace(change,store,{findContext:(index,array,context)=>{
	console.log("hello");
}});
console.log(store);
