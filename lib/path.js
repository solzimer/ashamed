const extend = require("extend");

function strToPath(path) {
	return Array.isArray(path)?
		path :
		path.replace(/ /g,"").split("/").filter(s=>s.length);
}

function pathToStr(path) {
	return typeof(path)=="string"? path : path.join("/");
}

function getPath(path,create,src,val) {
	var root = src || {};
	path = strToPath(path);
	if(!path.length) 	return root;
	while(path.length) {
		let folder = path.shift();
		if(!root[folder]) {
			if(create) {root[folder] = {};}
			else {return null;}
		}
		if(!path.length && val!==undefined)	{
			if(typeof(root[folder])=="object" && Object.keys(root[folder]).length) {
				if(typeof(val)=="object") extend(true,root[folder],val);
				else root[folder] = val;
			}
			else {
				root[folder] = val;
			}
		}
		root = root[folder];
		if(!path.length) return root;
	}
}

module.exports = {
	strToPath : strToPath,
	pathToStr : pathToStr,
	getPath : getPath
}
