const
	extend = require("extend"),
	Diff = require("deep-diff"),
	odiff = Diff.diff;

var arrays = [];
const DEL_TOKEN = "@#@_DELETED_@#@";

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

function diff(target,source) {
	var changes = odiff(target,source);
	return changes? JSON.parse(JSON.stringify(changes)) : [];
}

function applyDiff(target,source,path) {
	path = strToPath(path);
	var changes = diff(target,source) || [];
	changes.forEach(change=>{
		change.path = [].concat(path).concat(change.path||[]);
		applyChange(target,change);
	});

	arrays.forEach(arr=>{
		var idx = -1;
		do {
			idx = arr.indexOf(DEL_TOKEN);
			if(idx>=0) arr.splice(idx,1);
		}while(idx>=0);
	});
	arrays = [];
}

function applyChanges(target,changes,path) {
	path = strToPath(path);
	changes = changes || [];
	changes.forEach(change=>{
		change.path = [].concat(path).concat(change.path||[]);
		applyChange(target,change);
	});

	arrays.forEach(arr=>{
		var idx = -1;
		do {
			idx = arr.indexOf(DEL_TOKEN);
			if(idx>=0) arr.splice(idx,1);
		}while(idx>=0);
	});
	arrays = [];
}

function applyChange(target,change) {
	if (target && change && change.kind) {
    var it = target,
      i = -1,
      last = change.path ? change.path.length - 1 : 0;
    while (++i < last) {
      if (typeof it[change.path[i]] === 'undefined') {
        it[change.path[i]] = (typeof change.path[i] === 'number') ? [] : {};
      }
      it = it[change.path[i]];
    }
    switch (change.kind) {
      case 'A':
        applyArrayChange(change.path ? it[change.path[i]] : it, change.index, change.item);
        break;
      case 'D':
        delete it[change.path[i]];
        break;
      case 'E':
      case 'N':
				if(typeof(it[change.path[i]])=="object")
					extend(true,it[change.path[i]],change.rhs);
				else
					it[change.path[i]] = change.rhs;
        break;
    }
  }
}

function applyArrayChange(arr, index, change) {
  if (change.path && change.path.length) {
    var it = arr[index],
      i, u = change.path.length - 1;
    for (i = 0; i < u; i++) {
      it = it[change.path[i]];
    }
    switch (change.kind) {
      case 'A':
        applyArrayChange(it[change.path[i]], change.index, change.item);
        break;
      case 'D':
				it[change.path[i]] = DEL_TOKEN;
				if(arrays.indexOf(it)<0) arrays.push(it);
        //delete it[change.path[i]];
        break;
      case 'E':
      case 'N':
        it[change.path[i]] = change.rhs;
        break;
    }
  } else {
    switch (change.kind) {
      case 'A':
        applyArrayChange(arr[index], change.index, change.item);
        break;
      case 'D':
				arr[index] = DEL_TOKEN;
				if(arrays.indexOf(arr)<0) arrays.push(arr);
        break;
      case 'E':
      case 'N':
        arr[index] = change.rhs;
        break;
    }
  }
  return arr;
}

module.exports = {
	strToPath : strToPath,
	pathToStr : pathToStr,
	getPath : getPath,
	diff : diff,
	applyDiff : applyDiff,
	applyChange : applyChange,
	applyChanges : applyChanges,
}