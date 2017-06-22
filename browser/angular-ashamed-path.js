angular.module("ashamed-path",[]).

provider("path",function() {
	const extend = angular.merge;

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
		while(path.length) {
			let folder = path.shift();
			if(!root[folder]) {
				if(create) {root[folder] = {};}
				else {return null;}
			}
			if(!path.length && val)	{
				if(typeof(root[folder])=="object" && Object.keys(root[folder]).length)
					extend(root[folder],val);
				else
					root[folder] = val;
			}
			root = root[folder];
			if(!path.length) return root;
		}
	}

	this.$get = function() {
		return {
			strToPath : strToPath,
			pathToStr : pathToStr,
			getPath : getPath
		}
	}
});
