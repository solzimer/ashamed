const
	extend = require("extend"),
	jiff = require("jiff"),
	uid = require("./uid.js").uid;

function strToPath(path) {
	path = path || [];
	return Array.isArray(path)?
		path :
		path.replace(/ /g,"").split("/").filter(s=>s.length);
}

function pathToStr(path) {
	path = path || [];
	var res = typeof(path)=="string"? path : path.join("/");
	return res.startsWith("/") ? res : `/${res}`;
}

function concat(a,b) {
	a = strToPath(a);
	b = strToPath(b);
	return pathToStr([].concat(a).concat(b));
}

function getPath(path,create,src,val) {
	var root = src || {};
	path = strToPath(path);
	if(!path.length) 	{
		return extend(src,val);
	}
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

function diff(target,source) {
	var puid = uid();
	return jiff.
		diff(target,source).
		filter(d=>d.op!="test").
		map(d=>{return d.uid=puid, d});
}

function applyDiff(target,source,path) {
	var d = {};
	getPath(path,true,d,source);
	return extend(true,target,d);
}

function applyChanges(target,patch,path) {
	patch.forEach(p=>{
		p.opath = p.path;
		p.path = concat(path,p.path);
		var np = strToPath(p.path);
		if(np.length>1) np.pop();
		getPath(np,true,target);
	});
	jiff.patchInPlace(patch, target);
	patch.forEach(p=>{
		p.path = p.opath;
		delete p.opath;
	});
}

function applyChange(target,change) {
	getPath(change.path,false,target);
	jiff.patchInPlace([change], target);
}

module.exports = {
	strToPath : strToPath,
	pathToStr : pathToStr,
	getPath : getPath,
	diff : diff,
	concat : concat,
	applyDiff : applyDiff,
	applyChange : applyChange,
	applyChanges : applyChanges,
}
