const DEFAULT = "_DEFAULT_";
const HMAX = 10000;
const STORE = {
	[DEFAULT] : {
		hmap : {},
		hlist : []
	}
}

function uid() {
	return Math.random()+"_"+Date.now();
}

class UIDStore {
	constructor(id,max) {
		id = id===true? uid() : (id || DEFAULT);
		if(!STORE[id]) {
			STORE[id] = {hmap:{},hlist:[]}
		}

		this._id = id;
		this._max = max || HMAX;
		this._hmap = STORE[id].hmap;
		this._hlist = STORE[id].hlist;
	}

	static uid() {
			return uid();
	}

	uid() {
		return uid();
	}

	push(uid) {
		var hlist = this._hlist, hmap = this._hmap;
		uid = (uid||{}).uid || uid || null;

		if(!uid) return;

		hlist.push(uid);
		hmap[uid] = true;

		while(hlist.length>this._max) {
			let uid = hlist.shift();
			delete hmap[uid];
		}
	}

	contains(uid) {
		var hlist = this._hlist, hmap = this._hmap;
		uid = (uid||{}).uid || uid || null;

		return hmap[uid]===true;
	}
}

module.exports = UIDStore;
