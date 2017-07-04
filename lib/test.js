const diff = require("deep-diff").diff;
const odiff = require("odiff");
const jiff = require("jiff");

var a = {a:"hola",b:new Date().toISOString(),c:[{a:1},{a:2},{a:3},{a:4}]}
var b = JSON.parse(JSON.stringify(a));

b.c.shift();
b.c.push({a:5});

console.log(a);
console.log(b);

var d1 = diff(a,b);
var d2 = odiff(a,b);
var d3 = jiff.diff(a,b);

console.log(JSON.stringify(d1,null,2));
console.log(JSON.stringify(d2,null,2));
console.log(JSON.stringify(d3,null,2));
