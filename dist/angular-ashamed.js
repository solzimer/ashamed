"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
            }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
                var n = t[o][1][e];return s(n ? n : e);
            }, l, l.exports, e, t, n, r);
        }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
        s(r[o]);
    }return s;
})({ 1: [function (require, module, exports) {
        (function (window) {
            "use strict";

            var AshamedClient = require("../lib/client.js");
            var shm = angular.module("ashamed", []);

            shm.provider("ashamedConfig", function () {
                var self = this;
                this.host = "localhost:3000";
                this.base = "";
                this.realtime = true;

                this.$get = function () {
                    return {
                        host: self.host,
                        base: self.base,
                        realtime: self.realtime
                    };
                };
            });

            shm.service("ashamedService", ["ashamedConfig", "$q", "$rootScope", "$timeout", function (config, $q, $rootScope, $timeout) {
                var client = new AshamedClient(config);

                client.on("message", function () {
                    $rootScope.$apply();
                });

                function resolve(data) {
                    var q = $q.defer();
                    $timeout(function () {
                        $rootScope.$apply();
                    }, 10);
                    q.resolve(data);
                    return q.promise;
                }

                this.get = function (path, options) {
                    return client.get(path, options).then(resolve);
                };

                this.set = function (path, item, options) {
                    return client.set(path, item, options).then(resolve);
                };

                this.diff = function (path, changes) {
                    return client.diff(path, changes).then(resolve);
                };

                this.update = function (path, item) {
                    return client.update(path, item).then(resolve);
                };
            }]);
        })(window);
    }, { "../lib/client.js": 2 }], 2: [function (require, module, exports) {
        var q = require("q"),
            Path = require("./path.js"),
            extend = require("extend"),
            EventEmitter = require('events'),
            diff = Path.diff,
            applyChanges = Path.applyChanges,
            applyDiff = Path.applyDiff,
            strToPath = Path.strToPath,
            pathToStr = Path.pathToStr,
            getPath = Path.getPath;

        var WebSocketClient = typeof WebSocket !== "undefined" ? WebSocket : require('websocket').w3cwebsocket;

        var store = {},
            backup = {};
        var pending = {};

        var vfn = function vfn() {};
        var CHANNEL = "ashamed";
        var DEF_OPTS = {
            host: "localhost:3000",
            base: "",
            realtime: true

            /**
             * Handles the websocket responses
             * @param msg Websocket message
             */
        };function handleMessage(msg) {
            msg = JSON.parse(msg.data);
            // If channel is incorrect, do nothing
            if (msg.channel != CHANNEL) return;
            if (msg.type == "model-update") {
                modelUpdate(msg);
            } else if (msg.type == "response") {
                modelResponse(msg);
            }
        }

        /**
         * Updates the subscribed model with external changes
         * @param msg Websocket message data
         */
        function modelUpdate(msg) {
            var path = msg.args[0];
            var changes = msg.args[1] || [];
            //var bch = JSON.parse(JSON.stringify(changes));
            path = strToPath(path);

            // Apply all changes
            applyChanges(backup, changes, path);
            var patch = diff(store, backup);
            applyChanges(store, patch);
        }

        function modelResponse(msg) {
            var cid = msg.cid;

            var _msg$args = _slicedToArray(msg.args, 2),
                err = _msg$args[0],
                data = _msg$args[1];

            if (!pending[cid]) return;else {
                var cb = pending[cid];
                delete pending[cid];
                cb(err, data);
            }
        }

        var AshamedClient = function (_EventEmitter) {
            _inherits(AshamedClient, _EventEmitter);

            function AshamedClient(options) {
                _classCallCheck(this, AshamedClient);

                var _this = _possibleConstructorReturn(this, (AshamedClient.__proto__ || Object.getPrototypeOf(AshamedClient)).call(this));

                options = extend({}, DEF_OPTS, options);
                _this._options = options;
                _this._host = options.host;
                _this._base = options.base;
                _this._realtime = options.realtime;
                _this._url = {
                    ws: "ws://" + options.host + options.base + "/ws",
                    http: "http://" + options.host + options.base
                };
                _this._err = null;
                _this.connect();
                return _this;
            }

            _createClass(AshamedClient, [{
                key: "_send",
                value: function _send(msg, callback) {
                    var err = this._err;
                    msg.channel = CHANNEL;
                    callback = callback || vfn;

                    // Correlation ID to the callback
                    msg.cid = "ws_" + Math.random();
                    pending[msg.cid] = callback;

                    if (!err) {
                        this._ready.then(function (ws) {
                            ws.send(JSON.stringify(msg));
                        }, function (err) {
                            err.code = "ERROR";
                            callback(err, null);
                        });
                    } else {
                        err.code = "ERROR";
                        callback(err, null);
                    }
                }
            }, {
                key: "connect",
                value: function connect() {
                    var _this2 = this;

                    var def = q.defer();
                    var ws = new WebSocketClient(this._url.ws);
                    ws.onerror = function (err) {
                        _this2._err = "Unable to connect to " + _this2._url.ws;
                        _this2.emit("error", _this2._err);
                        def.reject(_this2._err);
                    };
                    ws.onopen = function () {
                        _this2._err = null;
                        _this2.emit("ready", _this2);
                        def.resolve(ws);
                    };
                    ws.onmessage = function (msg) {
                        handleMessage(msg);
                        _this2.emit("message", msg);
                    };
                    ws.onclose = function () {
                        _this2.emit("close");
                        _this2._err = new Error("Connection has been closed");
                    };
                    this._ready = def.promise;
                }
            }, {
                key: "get",
                value: function get(path, options) {
                    var def = q.defer();
                    var cid = "ws_" + Math.random();

                    options = extend({}, this._options, options);
                    this._send({ op: "get", args: [path, options] }, function (err, data) {
                        if (err && err.code) {
                            def.reject(err);
                        } else if (options.realtime && data !== null && data !== undefined) {
                            applyDiff(store, data, path);
                            backup = extend(true, {}, store);
                            def.resolve(getPath(path, false, store));
                        } else {
                            def.resolve(data);
                        }
                    });

                    return def.promise;
                }
            }, {
                key: "set",
                value: function set(path, item, options) {
                    var def = q.defer();
                    var cid = "ws_" + Math.random();

                    options = extend({}, this._options, options);
                    this._send({ op: "set", args: [path, item, options] }, function (err, data) {
                        if (err && err.code) {
                            def.reject(err);
                        } else if (options.realtime) {
                            applyDiff(store, data, path);
                            backup = extend(true, {}, store);
                            def.resolve(getPath(path, false, store));
                        } else {
                            def.resolve(data);
                        }
                    });

                    return def.promise;
                }
            }, {
                key: "update",
                value: function update(path, item) {
                    var s = store;
                    var old = getPath(path, true, backup);
                    var changes = diff(old, item);
                    return this.diff(path, changes);
                }
            }, {
                key: "diff",
                value: function diff(path, changes) {
                    var def = q.defer();
                    var cid = "ws_" + Math.random();

                    this._send({ op: "diff", args: [path, changes] }, function (err, data) {
                        if (err && err.code) {
                            def.reject(err);
                        } else {
                            def.resolve(data);
                        }
                    });

                    return def.promise;
                }
            }, {
                key: "path",
                value: function path(base) {
                    var def = q.defer();
                    var cid = "ws_" + Math.random();

                    this._send({ op: "path", args: [base] }, function (err, data) {
                        if (err && err.code) {
                            def.reject(err);
                        } else {
                            def.resolve(data);
                        }
                    });

                    return def.promise;
                }
            }, {
                key: "store",
                get: function get() {
                    return store;
                }
            }]);

            return AshamedClient;
        }(EventEmitter);

        module.exports = AshamedClient;
    }, { "./path.js": 3, "events": 4, "extend": 5, "q": 21, "websocket": 22 }], 3: [function (require, module, exports) {
        var extend = require("extend"),
            jiff = require("jiff");

        function strToPath(path) {
            path = path || [];
            return Array.isArray(path) ? path : path.replace(/ /g, "").split("/").filter(function (s) {
                return s.length;
            });
        }

        function pathToStr(path) {
            path = path || [];
            var res = typeof path == "string" ? path : path.join("/");
            return res.startsWith("/") ? res : "/" + res;
        }

        function concat(a, b) {
            a = strToPath(a);
            b = strToPath(b);
            return pathToStr([].concat(a).concat(b));
        }

        function getPath(path, create, src, val) {
            var root = src || {};
            path = strToPath(path);
            if (!path.length) {
                return extend(src, val);
            }
            while (path.length) {
                var folder = path.shift();
                if (!root[folder]) {
                    if (create) {
                        root[folder] = {};
                    } else {
                        return null;
                    }
                }
                if (!path.length && val !== undefined) {
                    if (_typeof(root[folder]) == "object" && Object.keys(root[folder]).length) {
                        if ((typeof val === "undefined" ? "undefined" : _typeof(val)) == "object") extend(true, root[folder], val);else root[folder] = val;
                    } else {
                        root[folder] = val;
                    }
                }
                root = root[folder];
                if (!path.length) return root;
            }
        }

        function diff(target, source) {
            return jiff.diff(target, source).filter(function (d) {
                return d.op != "test";
            });
        }

        function applyDiff(target, source, path) {
            var d = {};
            getPath(path, true, d, source);
            return extend(true, target, d);
        }

        function applyChanges(target, patch, path) {
            patch.forEach(function (p) {
                p.path = concat(path, p.path);
                getPath(p.path, false, target);
            });
            jiff.patchInPlace(patch, target);
        }

        function applyChange(target, change) {
            getPath(change.path, false, target);
            jiff.patchInPlace([change], target);
        }

        module.exports = {
            strToPath: strToPath,
            pathToStr: pathToStr,
            getPath: getPath,
            diff: diff,
            concat: concat,
            applyDiff: applyDiff,
            applyChange: applyChange,
            applyChanges: applyChanges
        };
    }, { "extend": 5, "jiff": 6 }], 4: [function (require, module, exports) {
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.

        function EventEmitter() {
            this._events = this._events || {};
            this._maxListeners = this._maxListeners || undefined;
        }
        module.exports = EventEmitter;

        // Backwards-compat with node 0.10.x
        EventEmitter.EventEmitter = EventEmitter;

        EventEmitter.prototype._events = undefined;
        EventEmitter.prototype._maxListeners = undefined;

        // By default EventEmitters will print a warning if more than 10 listeners are
        // added to it. This is a useful default which helps finding memory leaks.
        EventEmitter.defaultMaxListeners = 10;

        // Obviously not all Emitters should be limited to 10. This function allows
        // that to be increased. Set to zero for unlimited.
        EventEmitter.prototype.setMaxListeners = function (n) {
            if (!isNumber(n) || n < 0 || isNaN(n)) throw TypeError('n must be a positive number');
            this._maxListeners = n;
            return this;
        };

        EventEmitter.prototype.emit = function (type) {
            var er, handler, len, args, i, listeners;

            if (!this._events) this._events = {};

            // If there is no 'error' event listener then throw.
            if (type === 'error') {
                if (!this._events.error || isObject(this._events.error) && !this._events.error.length) {
                    er = arguments[1];
                    if (er instanceof Error) {
                        throw er; // Unhandled 'error' event
                    } else {
                        // At least give some kind of context to the user
                        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
                        err.context = er;
                        throw err;
                    }
                }
            }

            handler = this._events[type];

            if (isUndefined(handler)) return false;

            if (isFunction(handler)) {
                switch (arguments.length) {
                    // fast cases
                    case 1:
                        handler.call(this);
                        break;
                    case 2:
                        handler.call(this, arguments[1]);
                        break;
                    case 3:
                        handler.call(this, arguments[1], arguments[2]);
                        break;
                    // slower
                    default:
                        args = Array.prototype.slice.call(arguments, 1);
                        handler.apply(this, args);
                }
            } else if (isObject(handler)) {
                args = Array.prototype.slice.call(arguments, 1);
                listeners = handler.slice();
                len = listeners.length;
                for (i = 0; i < len; i++) {
                    listeners[i].apply(this, args);
                }
            }

            return true;
        };

        EventEmitter.prototype.addListener = function (type, listener) {
            var m;

            if (!isFunction(listener)) throw TypeError('listener must be a function');

            if (!this._events) this._events = {};

            // To avoid recursion in the case that type === "newListener"! Before
            // adding it to the listeners, first emit "newListener".
            if (this._events.newListener) this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);

            if (!this._events[type])
                // Optimize the case of one listener. Don't need the extra array object.
                this._events[type] = listener;else if (isObject(this._events[type]))
                // If we've already got an array, just append.
                this._events[type].push(listener);else
                // Adding the second element, need to change to array.
                this._events[type] = [this._events[type], listener];

            // Check for listener leak
            if (isObject(this._events[type]) && !this._events[type].warned) {
                if (!isUndefined(this._maxListeners)) {
                    m = this._maxListeners;
                } else {
                    m = EventEmitter.defaultMaxListeners;
                }

                if (m && m > 0 && this._events[type].length > m) {
                    this._events[type].warned = true;
                    console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
                    if (typeof console.trace === 'function') {
                        // not supported in IE 10
                        console.trace();
                    }
                }
            }

            return this;
        };

        EventEmitter.prototype.on = EventEmitter.prototype.addListener;

        EventEmitter.prototype.once = function (type, listener) {
            if (!isFunction(listener)) throw TypeError('listener must be a function');

            var fired = false;

            function g() {
                this.removeListener(type, g);

                if (!fired) {
                    fired = true;
                    listener.apply(this, arguments);
                }
            }

            g.listener = listener;
            this.on(type, g);

            return this;
        };

        // emits a 'removeListener' event iff the listener was removed
        EventEmitter.prototype.removeListener = function (type, listener) {
            var list, position, length, i;

            if (!isFunction(listener)) throw TypeError('listener must be a function');

            if (!this._events || !this._events[type]) return this;

            list = this._events[type];
            length = list.length;
            position = -1;

            if (list === listener || isFunction(list.listener) && list.listener === listener) {
                delete this._events[type];
                if (this._events.removeListener) this.emit('removeListener', type, listener);
            } else if (isObject(list)) {
                for (i = length; i-- > 0;) {
                    if (list[i] === listener || list[i].listener && list[i].listener === listener) {
                        position = i;
                        break;
                    }
                }

                if (position < 0) return this;

                if (list.length === 1) {
                    list.length = 0;
                    delete this._events[type];
                } else {
                    list.splice(position, 1);
                }

                if (this._events.removeListener) this.emit('removeListener', type, listener);
            }

            return this;
        };

        EventEmitter.prototype.removeAllListeners = function (type) {
            var key, listeners;

            if (!this._events) return this;

            // not listening for removeListener, no need to emit
            if (!this._events.removeListener) {
                if (arguments.length === 0) this._events = {};else if (this._events[type]) delete this._events[type];
                return this;
            }

            // emit removeListener for all listeners on all events
            if (arguments.length === 0) {
                for (key in this._events) {
                    if (key === 'removeListener') continue;
                    this.removeAllListeners(key);
                }
                this.removeAllListeners('removeListener');
                this._events = {};
                return this;
            }

            listeners = this._events[type];

            if (isFunction(listeners)) {
                this.removeListener(type, listeners);
            } else if (listeners) {
                // LIFO order
                while (listeners.length) {
                    this.removeListener(type, listeners[listeners.length - 1]);
                }
            }
            delete this._events[type];

            return this;
        };

        EventEmitter.prototype.listeners = function (type) {
            var ret;
            if (!this._events || !this._events[type]) ret = [];else if (isFunction(this._events[type])) ret = [this._events[type]];else ret = this._events[type].slice();
            return ret;
        };

        EventEmitter.prototype.listenerCount = function (type) {
            if (this._events) {
                var evlistener = this._events[type];

                if (isFunction(evlistener)) return 1;else if (evlistener) return evlistener.length;
            }
            return 0;
        };

        EventEmitter.listenerCount = function (emitter, type) {
            return emitter.listenerCount(type);
        };

        function isFunction(arg) {
            return typeof arg === 'function';
        }

        function isNumber(arg) {
            return typeof arg === 'number';
        }

        function isObject(arg) {
            return (typeof arg === "undefined" ? "undefined" : _typeof(arg)) === 'object' && arg !== null;
        }

        function isUndefined(arg) {
            return arg === void 0;
        }
    }, {}], 5: [function (require, module, exports) {
        'use strict';

        var hasOwn = Object.prototype.hasOwnProperty;
        var toStr = Object.prototype.toString;

        var isArray = function isArray(arr) {
            if (typeof Array.isArray === 'function') {
                return Array.isArray(arr);
            }

            return toStr.call(arr) === '[object Array]';
        };

        var isPlainObject = function isPlainObject(obj) {
            if (!obj || toStr.call(obj) !== '[object Object]') {
                return false;
            }

            var hasOwnConstructor = hasOwn.call(obj, 'constructor');
            var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
            // Not own constructor property must be Object
            if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
                return false;
            }

            // Own properties are enumerated firstly, so to speed up,
            // if last one is own, then all properties are own.
            var key;
            for (key in obj) {/**/}

            return typeof key === 'undefined' || hasOwn.call(obj, key);
        };

        module.exports = function extend() {
            var options, name, src, copy, copyIsArray, clone;
            var target = arguments[0];
            var i = 1;
            var length = arguments.length;
            var deep = false;

            // Handle a deep copy situation
            if (typeof target === 'boolean') {
                deep = target;
                target = arguments[1] || {};
                // skip the boolean and the target
                i = 2;
            }
            if (target == null || (typeof target === "undefined" ? "undefined" : _typeof(target)) !== 'object' && typeof target !== 'function') {
                target = {};
            }

            for (; i < length; ++i) {
                options = arguments[i];
                // Only deal with non-null/undefined values
                if (options != null) {
                    // Extend the base object
                    for (name in options) {
                        src = target[name];
                        copy = options[name];

                        // Prevent never-ending loop
                        if (target !== copy) {
                            // Recurse if we're merging plain objects or arrays
                            if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                                if (copyIsArray) {
                                    copyIsArray = false;
                                    clone = src && isArray(src) ? src : [];
                                } else {
                                    clone = src && isPlainObject(src) ? src : {};
                                }

                                // Never move original objects, clone them
                                target[name] = extend(deep, clone, copy);

                                // Don't bring in undefined values
                            } else if (typeof copy !== 'undefined') {
                                target[name] = copy;
                            }
                        }
                    }
                }
            }

            // Return the modified object
            return target;
        };
    }, {}], 6: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        var lcs = require('./lib/lcs');
        var array = require('./lib/array');
        var patch = require('./lib/jsonPatch');
        var inverse = require('./lib/inverse');
        var jsonPointer = require('./lib/jsonPointer');
        var encodeSegment = jsonPointer.encodeSegment;

        exports.diff = diff;
        exports.patch = patch.apply;
        exports.patchInPlace = patch.applyInPlace;
        exports.inverse = inverse;
        exports.clone = patch.clone;

        // Errors
        exports.InvalidPatchOperationError = require('./lib/InvalidPatchOperationError');
        exports.TestFailedError = require('./lib/TestFailedError');
        exports.PatchNotInvertibleError = require('./lib/PatchNotInvertibleError');

        var isValidObject = patch.isValidObject;
        var defaultHash = patch.defaultHash;

        /**
         * Compute a JSON Patch representing the differences between a and b.
         * @param {object|array|string|number|null} a
         * @param {object|array|string|number|null} b
         * @param {?function|?object} options if a function, see options.hash
         * @param {?function(x:*):String|Number} options.hash used to hash array items
         *  in order to recognize identical objects, defaults to JSON.stringify
         * @param {?function(index:Number, array:Array):object} options.makeContext
         *  used to generate patch context. If not provided, context will not be generated
         * @returns {array} JSON Patch such that patch(diff(a, b), a) ~ b
         */
        function diff(a, b, options) {
            return appendChanges(a, b, '', initState(options, [])).patch;
        }

        /**
         * Create initial diff state from the provided options
         * @param {?function|?object} options @see diff options above
         * @param {array} patch an empty or existing JSON Patch array into which
         *  the diff should generate new patch operations
         * @returns {object} initialized diff state
         */
        function initState(options, patch) {
            if ((typeof options === "undefined" ? "undefined" : _typeof(options)) === 'object') {
                return {
                    patch: patch,
                    hash: orElse(isFunction, options.hash, defaultHash),
                    makeContext: orElse(isFunction, options.makeContext, defaultContext),
                    invertible: !(options.invertible === false)
                };
            } else {
                return {
                    patch: patch,
                    hash: orElse(isFunction, options, defaultHash),
                    makeContext: defaultContext,
                    invertible: true
                };
            }
        }

        /**
         * Given two JSON values (object, array, number, string, etc.), find their
         * differences and append them to the diff state
         * @param {object|array|string|number|null} a
         * @param {object|array|string|number|null} b
         * @param {string} path
         * @param {object} state
         * @returns {Object} updated diff state
         */
        function appendChanges(a, b, path, state) {
            if (Array.isArray(a) && Array.isArray(b)) {
                return appendArrayChanges(a, b, path, state);
            }

            if (isValidObject(a) && isValidObject(b)) {
                return appendObjectChanges(a, b, path, state);
            }

            return appendValueChanges(a, b, path, state);
        }

        /**
         * Given two objects, find their differences and append them to the diff state
         * @param {object} o1
         * @param {object} o2
         * @param {string} path
         * @param {object} state
         * @returns {Object} updated diff state
         */
        function appendObjectChanges(o1, o2, path, state) {
            var keys = Object.keys(o2);
            var patch = state.patch;
            var i, key;

            for (i = keys.length - 1; i >= 0; --i) {
                key = keys[i];
                var keyPath = path + '/' + encodeSegment(key);
                if (o1[key] !== void 0) {
                    appendChanges(o1[key], o2[key], keyPath, state);
                } else {
                    patch.push({ op: 'add', path: keyPath, value: o2[key] });
                }
            }

            keys = Object.keys(o1);
            for (i = keys.length - 1; i >= 0; --i) {
                key = keys[i];
                if (o2[key] === void 0) {
                    var p = path + '/' + encodeSegment(key);
                    if (state.invertible) {
                        patch.push({ op: 'test', path: p, value: o1[key] });
                    }
                    patch.push({ op: 'remove', path: p });
                }
            }

            return state;
        }

        /**
         * Given two arrays, find their differences and append them to the diff state
         * @param {array} a1
         * @param {array} a2
         * @param {string} path
         * @param {object} state
         * @returns {Object} updated diff state
         */
        function appendArrayChanges(a1, a2, path, state) {
            var a1hash = array.map(state.hash, a1);
            var a2hash = array.map(state.hash, a2);

            var lcsMatrix = lcs.compare(a1hash, a2hash);

            return lcsToJsonPatch(a1, a2, path, state, lcsMatrix);
        }

        /**
         * Transform an lcsMatrix into JSON Patch operations and append
         * them to state.patch, recursing into array elements as necessary
         * @param {array} a1
         * @param {array} a2
         * @param {string} path
         * @param {object} state
         * @param {object} lcsMatrix
         * @returns {object} new state with JSON Patch operations added based
         *  on the provided lcsMatrix
         */
        function lcsToJsonPatch(a1, a2, path, state, lcsMatrix) {
            var offset = 0;
            return lcs.reduce(function (state, op, i, j) {
                var last, context;
                var patch = state.patch;
                var p = path + '/' + (j + offset);

                if (op === lcs.REMOVE) {
                    // Coalesce adjacent remove + add into replace
                    last = patch[patch.length - 1];
                    context = state.makeContext(j, a1);

                    if (state.invertible) {
                        patch.push({ op: 'test', path: p, value: a1[j], context: context });
                    }

                    if (last !== void 0 && last.op === 'add' && last.path === p) {
                        last.op = 'replace';
                        last.context = context;
                    } else {
                        patch.push({ op: 'remove', path: p, context: context });
                    }

                    offset -= 1;
                } else if (op === lcs.ADD) {
                    // See https://tools.ietf.org/html/rfc6902#section-4.1
                    // May use either index===length *or* '-' to indicate appending to array
                    patch.push({ op: 'add', path: p, value: a2[i],
                        context: state.makeContext(j, a1)
                    });

                    offset += 1;
                } else {
                    appendChanges(a1[j], a2[i], p, state);
                }

                return state;
            }, state, lcsMatrix);
        }

        /**
         * Given two number|string|null values, if they differ, append to diff state
         * @param {string|number|null} a
         * @param {string|number|null} b
         * @param {string} path
         * @param {object} state
         * @returns {object} updated diff state
         */
        function appendValueChanges(a, b, path, state) {
            if (a !== b) {
                if (state.invertible) {
                    state.patch.push({ op: 'test', path: path, value: a });
                }

                state.patch.push({ op: 'replace', path: path, value: b });
            }

            return state;
        }

        /**
         * @param {function} predicate
         * @param {*} x
         * @param {*} y
         * @returns {*} x if predicate(x) is truthy, otherwise y
         */
        function orElse(predicate, x, y) {
            return predicate(x) ? x : y;
        }

        /**
         * Default patch context generator
         * @returns {undefined} undefined context
         */
        function defaultContext() {
            return void 0;
        }

        /**
         * @param {*} x
         * @returns {boolean} true if x is a function, false otherwise
         */
        function isFunction(x) {
            return typeof x === 'function';
        }
    }, { "./lib/InvalidPatchOperationError": 7, "./lib/PatchNotInvertibleError": 8, "./lib/TestFailedError": 9, "./lib/array": 10, "./lib/inverse": 14, "./lib/jsonPatch": 15, "./lib/jsonPointer": 16, "./lib/lcs": 18 }], 7: [function (require, module, exports) {
        module.exports = InvalidPatchOperationError;

        function InvalidPatchOperationError(message) {
            Error.call(this);
            this.name = this.constructor.name;
            this.message = message;
            if (typeof Error.captureStackTrace === 'function') {
                Error.captureStackTrace(this, this.constructor);
            }
        }

        InvalidPatchOperationError.prototype = Object.create(Error.prototype);
        InvalidPatchOperationError.prototype.constructor = InvalidPatchOperationError;
    }, {}], 8: [function (require, module, exports) {
        module.exports = PatchNotInvertibleError;

        function PatchNotInvertibleError(message) {
            Error.call(this);
            this.name = this.constructor.name;
            this.message = message;
            if (typeof Error.captureStackTrace === 'function') {
                Error.captureStackTrace(this, this.constructor);
            }
        }

        PatchNotInvertibleError.prototype = Object.create(Error.prototype);
        PatchNotInvertibleError.prototype.constructor = PatchNotInvertibleError;
    }, {}], 9: [function (require, module, exports) {
        module.exports = TestFailedError;

        function TestFailedError(message) {
            Error.call(this);
            this.name = this.constructor.name;
            this.message = message;
            if (typeof Error.captureStackTrace === 'function') {
                Error.captureStackTrace(this, this.constructor);
            }
        }

        TestFailedError.prototype = Object.create(Error.prototype);
        TestFailedError.prototype.constructor = TestFailedError;
    }, {}], 10: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        exports.cons = cons;
        exports.tail = tail;
        exports.map = map;

        /**
         * Prepend x to a, without mutating a. Faster than a.unshift(x)
         * @param {*} x
         * @param {Array} a array-like
         * @returns {Array} new Array with x prepended
         */
        function cons(x, a) {
            var l = a.length;
            var b = new Array(l + 1);
            b[0] = x;
            for (var i = 0; i < l; ++i) {
                b[i + 1] = a[i];
            }

            return b;
        }

        /**
         * Create a new Array containing all elements in a, except the first.
         *  Faster than a.slice(1)
         * @param {Array} a array-like
         * @returns {Array} new Array, the equivalent of a.slice(1)
         */
        function tail(a) {
            var l = a.length - 1;
            var b = new Array(l);
            for (var i = 0; i < l; ++i) {
                b[i] = a[i + 1];
            }

            return b;
        }

        /**
         * Map any array-like. Faster than Array.prototype.map
         * @param {function} f
         * @param {Array} a array-like
         * @returns {Array} new Array mapped by f
         */
        function map(f, a) {
            var b = new Array(a.length);
            for (var i = 0; i < a.length; ++i) {
                b[i] = f(a[i]);
            }
            return b;
        }
    }, {}], 11: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        /**
         * Create a deep copy of x which must be a legal JSON object/array/value
         * @param {object|array|string|number|null} x object/array/value to clone
         * @returns {object|array|string|number|null} clone of x
         */
        module.exports = clone;

        function clone(x) {
            if (x == null || (typeof x === "undefined" ? "undefined" : _typeof(x)) !== 'object') {
                return x;
            }

            if (Array.isArray(x)) {
                return cloneArray(x);
            }

            return cloneObject(x);
        }

        function cloneArray(x) {
            var l = x.length;
            var y = new Array(l);

            for (var i = 0; i < l; ++i) {
                y[i] = clone(x[i]);
            }

            return y;
        }

        function cloneObject(x) {
            var keys = Object.keys(x);
            var y = {};

            for (var k, i = 0, l = keys.length; i < l; ++i) {
                k = keys[i];
                y[k] = clone(x[k]);
            }

            return y;
        }
    }, {}], 12: [function (require, module, exports) {
        var jsonPointer = require('./jsonPointer');

        /**
         * commute the patch sequence a,b to b,a
         * @param {object} a patch operation
         * @param {object} b patch operation
         */
        module.exports = function commutePaths(a, b) {
            // TODO: cases for special paths: '' and '/'
            var left = jsonPointer.parse(a.path);
            var right = jsonPointer.parse(b.path);
            var prefix = getCommonPathPrefix(left, right);
            var isArray = isArrayPath(left, right, prefix.length);

            // Never mutate the originals
            var ac = copyPatch(a);
            var bc = copyPatch(b);

            if (prefix.length === 0 && !isArray) {
                // Paths share no common ancestor, simple swap
                return [bc, ac];
            }

            if (isArray) {
                return commuteArrayPaths(ac, left, bc, right);
            } else {
                return commuteTreePaths(ac, left, bc, right);
            }
        };

        function commuteTreePaths(a, left, b, right) {
            if (a.path === b.path) {
                throw new TypeError('cannot commute ' + a.op + ',' + b.op + ' with identical object paths');
            }
            // FIXME: Implement tree path commutation
            return [b, a];
        }

        /**
         * Commute two patches whose common ancestor (which may be the immediate parent)
         * is an array
         * @param a
         * @param left
         * @param b
         * @param right
         * @returns {*}
         */
        function commuteArrayPaths(a, left, b, right) {
            if (left.length === right.length) {
                return commuteArraySiblings(a, left, b, right);
            }

            if (left.length > right.length) {
                // left is longer, commute by "moving" it to the right
                left = commuteArrayAncestor(b, right, a, left, -1);
                a.path = jsonPointer.absolute(jsonPointer.join(left));
            } else {
                // right is longer, commute by "moving" it to the left
                right = commuteArrayAncestor(a, left, b, right, 1);
                b.path = jsonPointer.absolute(jsonPointer.join(right));
            }

            return [b, a];
        }

        function isArrayPath(left, right, index) {
            return jsonPointer.isValidArrayIndex(left[index]) && jsonPointer.isValidArrayIndex(right[index]);
        }

        /**
         * Commute two patches referring to items in the same array
         * @param l
         * @param lpath
         * @param r
         * @param rpath
         * @returns {*[]}
         */
        function commuteArraySiblings(l, lpath, r, rpath) {

            var target = lpath.length - 1;
            var lindex = +lpath[target];
            var rindex = +rpath[target];

            var commuted;

            if (lindex < rindex) {
                // Adjust right path
                if (l.op === 'add' || l.op === 'copy') {
                    commuted = rpath.slice();
                    commuted[target] = Math.max(0, rindex - 1);
                    r.path = jsonPointer.absolute(jsonPointer.join(commuted));
                } else if (l.op === 'remove') {
                    commuted = rpath.slice();
                    commuted[target] = rindex + 1;
                    r.path = jsonPointer.absolute(jsonPointer.join(commuted));
                }
            } else if (r.op === 'add' || r.op === 'copy') {
                // Adjust left path
                commuted = lpath.slice();
                commuted[target] = lindex + 1;
                l.path = jsonPointer.absolute(jsonPointer.join(commuted));
            } else if (lindex > rindex && r.op === 'remove') {
                // Adjust left path only if remove was at a (strictly) lower index
                commuted = lpath.slice();
                commuted[target] = Math.max(0, lindex - 1);
                l.path = jsonPointer.absolute(jsonPointer.join(commuted));
            }

            return [r, l];
        }

        /**
         * Commute two patches with a common array ancestor
         * @param l
         * @param lpath
         * @param r
         * @param rpath
         * @param direction
         * @returns {*}
         */
        function commuteArrayAncestor(l, lpath, r, rpath, direction) {
            // rpath is longer or same length

            var target = lpath.length - 1;
            var lindex = +lpath[target];
            var rindex = +rpath[target];

            // Copy rpath, then adjust its array index
            var rc = rpath.slice();

            if (lindex > rindex) {
                return rc;
            }

            if (l.op === 'add' || l.op === 'copy') {
                rc[target] = Math.max(0, rindex - direction);
            } else if (l.op === 'remove') {
                rc[target] = Math.max(0, rindex + direction);
            }

            return rc;
        }

        function getCommonPathPrefix(p1, p2) {
            var p1l = p1.length;
            var p2l = p2.length;
            if (p1l === 0 || p2l === 0 || p1l < 2 && p2l < 2) {
                return [];
            }

            // If paths are same length, the last segment cannot be part
            // of a common prefix.  If not the same length, the prefix cannot
            // be longer than the shorter path.
            var l = p1l === p2l ? p1l - 1 : Math.min(p1l, p2l);

            var i = 0;
            while (i < l && p1[i] === p2[i]) {
                ++i;
            }

            return p1.slice(0, i);
        }

        function copyPatch(p) {
            if (p.op === 'remove') {
                return { op: p.op, path: p.path };
            }

            if (p.op === 'copy' || p.op === 'move') {
                return { op: p.op, path: p.path, from: p.from };
            }

            // test, add, replace
            return { op: p.op, path: p.path, value: p.value };
        }
    }, { "./jsonPointer": 16 }], 13: [function (require, module, exports) {
        module.exports = deepEquals;

        /**
         * Compare 2 JSON values, or recursively compare 2 JSON objects or arrays
         * @param {object|array|string|number|boolean|null} a
         * @param {object|array|string|number|boolean|null} b
         * @returns {boolean} true iff a and b are recursively equal
         */
        function deepEquals(a, b) {
            if (a === b) {
                return true;
            }

            if (Array.isArray(a) && Array.isArray(b)) {
                return compareArrays(a, b);
            }

            if ((typeof a === "undefined" ? "undefined" : _typeof(a)) === 'object' && (typeof b === "undefined" ? "undefined" : _typeof(b)) === 'object') {
                return compareObjects(a, b);
            }

            return false;
        }

        function compareArrays(a, b) {
            if (a.length !== b.length) {
                return false;
            }

            for (var i = 0; i < a.length; ++i) {
                if (!deepEquals(a[i], b[i])) {
                    return false;
                }
            }

            return true;
        }

        function compareObjects(a, b) {
            if (a === null && b !== null || a !== null && b === null) {
                return false;
            }

            var akeys = Object.keys(a);
            var bkeys = Object.keys(b);

            if (akeys.length !== bkeys.length) {
                return false;
            }

            for (var i = 0, k; i < akeys.length; ++i) {
                k = akeys[i];
                if (!(k in b && deepEquals(a[k], b[k]))) {
                    return false;
                }
            }

            return true;
        }
    }, {}], 14: [function (require, module, exports) {
        var patches = require('./patches');

        module.exports = function inverse(p) {
            var pr = [];
            var i, skip;
            for (i = p.length - 1; i >= 0; i -= skip) {
                skip = invertOp(pr, p[i], i, p);
            }

            return pr;
        };

        function invertOp(patch, c, i, context) {
            var op = patches[c.op];
            return op !== void 0 && typeof op.inverse === 'function' ? op.inverse(patch, c, i, context) : 1;
        }
    }, { "./patches": 19 }], 15: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        var patches = require('./patches');
        var clone = require('./clone');
        var InvalidPatchOperationError = require('./InvalidPatchOperationError');

        exports.apply = patch;
        exports.applyInPlace = patchInPlace;
        exports.clone = clone;
        exports.isValidObject = isValidObject;
        exports.defaultHash = defaultHash;

        var defaultOptions = {};

        /**
         * Apply the supplied JSON Patch to x
         * @param {array} changes JSON Patch
         * @param {object|array|string|number} x object/array/value to patch
         * @param {object} options
         * @param {function(index:Number, array:Array, context:object):Number} options.findContext
         *  function used adjust array indexes for smarty/fuzzy patching, for
         *  patches containing context
         * @returns {object|array|string|number} patched version of x. If x is
         *  an array or object, it will be mutated and returned. Otherwise, if
         *  x is a value, the new value will be returned.
         */
        function patch(changes, x, options) {
            return patchInPlace(changes, clone(x), options);
        }

        function patchInPlace(changes, x, options) {
            if (!options) {
                options = defaultOptions;
            }

            // TODO: Consider throwing if changes is not an array
            if (!Array.isArray(changes)) {
                return x;
            }

            var patch, p;
            for (var i = 0; i < changes.length; ++i) {
                p = changes[i];
                patch = patches[p.op];

                if (patch === void 0) {
                    throw new InvalidPatchOperationError('invalid op ' + JSON.stringify(p));
                }

                x = patch.apply(x, p, options);
            }

            return x;
        }

        function defaultHash(x) {
            return isValidObject(x) || isArray(x) ? JSON.stringify(x) : x;
        }

        function isValidObject(x) {
            return x !== null && Object.prototype.toString.call(x) === '[object Object]';
        }

        function isArray(x) {
            return Object.prototype.toString.call(x) === '[object Array]';
        }
    }, { "./InvalidPatchOperationError": 7, "./clone": 11, "./patches": 19 }], 16: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        var _parse = require('./jsonPointerParse');

        exports.find = find;
        exports.join = join;
        exports.absolute = absolute;
        exports.parse = parse;
        exports.contains = contains;
        exports.encodeSegment = encodeSegment;
        exports.decodeSegment = decodeSegment;
        exports.parseArrayIndex = parseArrayIndex;
        exports.isValidArrayIndex = isValidArrayIndex;

        // http://tools.ietf.org/html/rfc6901#page-2
        var separator = '/';
        var separatorRx = /\//g;
        var encodedSeparator = '~1';
        var encodedSeparatorRx = /~1/g;

        var escapeChar = '~';
        var escapeRx = /~/g;
        var encodedEscape = '~0';
        var encodedEscapeRx = /~0/g;

        /**
         * Find the parent of the specified path in x and return a descriptor
         * containing the parent and a key.  If the parent does not exist in x,
         * return undefined, instead.
         * @param {object|array} x object or array in which to search
         * @param {string} path JSON Pointer string (encoded)
         * @param {?function(index:Number, array:Array, context:object):Number} findContext
         *  optional function used adjust array indexes for smarty/fuzzy patching, for
         *  patches containing context.  If provided, context MUST also be provided.
         * @param {?{before:Array, after:Array}} context optional patch context for
         *  findContext to use to adjust array indices.  If provided, findContext MUST
         *  also be provided.
         * @returns {{target:object|array|number|string, key:string}|undefined}
         */
        function find(x, path, findContext, context) {
            if (typeof path !== 'string') {
                return;
            }

            if (path === '') {
                // whole document
                return { target: x, key: void 0 };
            }

            if (path === separator) {
                return { target: x, key: '' };
            }

            var parent = x,
                key;
            var hasContext = context !== void 0;

            _parse(path, function (segment) {
                // hm... this seems like it should be if(typeof x === 'undefined')
                if (x == null) {
                    // Signal that we prematurely hit the end of the path hierarchy.
                    parent = null;
                    return false;
                }

                if (Array.isArray(x)) {
                    key = hasContext ? findIndex(findContext, parseArrayIndex(segment), x, context) : segment === '-' ? segment : parseArrayIndex(segment);
                } else {
                    key = segment;
                }

                parent = x;
                x = x[key];
            });

            return parent === null ? void 0 : { target: parent, key: key };
        }

        function absolute(path) {
            return path[0] === separator ? path : separator + path;
        }

        function join(segments) {
            return segments.join(separator);
        }

        function parse(path) {
            var segments = [];
            _parse(path, segments.push.bind(segments));
            return segments;
        }

        function contains(a, b) {
            return b.indexOf(a) === 0 && b[a.length] === separator;
        }

        /**
         * Decode a JSON Pointer path segment
         * @see http://tools.ietf.org/html/rfc6901#page-3
         * @param {string} s encoded segment
         * @returns {string} decoded segment
         */
        function decodeSegment(s) {
            // See: http://tools.ietf.org/html/rfc6901#page-3
            return s.replace(encodedSeparatorRx, separator).replace(encodedEscapeRx, escapeChar);
        }

        /**
         * Encode a JSON Pointer path segment
         * @see http://tools.ietf.org/html/rfc6901#page-3
         * @param {string} s decoded segment
         * @returns {string} encoded segment
         */
        function encodeSegment(s) {
            return s.replace(escapeRx, encodedEscape).replace(separatorRx, encodedSeparator);
        }

        var arrayIndexRx = /^(0|[1-9]\d*)$/;

        /**
         * Return true if s is a valid JSON Pointer array index
         * @param {String} s
         * @returns {boolean}
         */
        function isValidArrayIndex(s) {
            return arrayIndexRx.test(s);
        }

        /**
         * Safely parse a string into a number >= 0. Does not check for decimal numbers
         * @param {string} s numeric string
         * @returns {number} number >= 0
         */
        function parseArrayIndex(s) {
            if (isValidArrayIndex(s)) {
                return +s;
            }

            throw new SyntaxError('invalid array index ' + s);
        }

        function findIndex(findContext, start, array, context) {
            var index = start;

            if (index < 0) {
                throw new Error('array index out of bounds ' + index);
            }

            if (context !== void 0 && typeof findContext === 'function') {
                index = findContext(start, array, context);
                if (index < 0) {
                    throw new Error('could not find patch context ' + context);
                }
            }

            return index;
        }
    }, { "./jsonPointerParse": 17 }], 17: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        module.exports = jsonPointerParse;

        var parseRx = /\/|~1|~0/g;
        var separator = '/';
        var escapeChar = '~';
        var encodedSeparator = '~1';

        /**
         * Parse through an encoded JSON Pointer string, decoding each path segment
         * and passing it to an onSegment callback function.
         * @see https://tools.ietf.org/html/rfc6901#section-4
         * @param {string} path encoded JSON Pointer string
         * @param {{function(segment:string):boolean}} onSegment callback function
         * @returns {string} original path
         */
        function jsonPointerParse(path, onSegment) {
            var pos, accum, matches, match;

            pos = path.charAt(0) === separator ? 1 : 0;
            accum = '';
            parseRx.lastIndex = pos;

            while (matches = parseRx.exec(path)) {

                match = matches[0];
                accum += path.slice(pos, parseRx.lastIndex - match.length);
                pos = parseRx.lastIndex;

                if (match === separator) {
                    if (onSegment(accum) === false) return path;
                    accum = '';
                } else {
                    accum += match === encodedSeparator ? separator : escapeChar;
                }
            }

            accum += path.slice(pos);
            onSegment(accum);

            return path;
        }
    }, {}], 18: [function (require, module, exports) {
        /** @license MIT License (c) copyright 2010-2014 original author or authors */
        /** @author Brian Cavalier */
        /** @author John Hann */

        exports.compare = compare;
        exports.reduce = reduce;

        var REMOVE, RIGHT, ADD, DOWN, SKIP;

        exports.REMOVE = REMOVE = RIGHT = -1;
        exports.ADD = ADD = DOWN = 1;
        exports.EQUAL = SKIP = 0;

        /**
         * Create an lcs comparison matrix describing the differences
         * between two array-like sequences
         * @param {array} a array-like
         * @param {array} b array-like
         * @returns {object} lcs descriptor, suitable for passing to reduce()
         */
        function compare(a, b) {
            var cols = a.length;
            var rows = b.length;

            var prefix = findPrefix(a, b);
            var suffix = prefix < cols && prefix < rows ? findSuffix(a, b, prefix) : 0;

            var remove = suffix + prefix - 1;
            cols -= remove;
            rows -= remove;
            var matrix = createMatrix(cols, rows);

            for (var j = cols - 1; j >= 0; --j) {
                for (var i = rows - 1; i >= 0; --i) {
                    matrix[i][j] = backtrack(matrix, a, b, prefix, j, i);
                }
            }

            return {
                prefix: prefix,
                matrix: matrix,
                suffix: suffix
            };
        }

        /**
         * Reduce a set of lcs changes previously created using compare
         * @param {function(result:*, type:number, i:number, j:number)} f
         *  reducer function, where:
         *  - result is the current reduce value,
         *  - type is the type of change: ADD, REMOVE, or SKIP
         *  - i is the index of the change location in b
         *  - j is the index of the change location in a
         * @param {*} r initial value
         * @param {object} lcs results returned by compare()
         * @returns {*} the final reduced value
         */
        function reduce(f, r, lcs) {
            var i, j, k, op;

            var m = lcs.matrix;

            // Reduce shared prefix
            var l = lcs.prefix;
            for (i = 0; i < l; ++i) {
                r = f(r, SKIP, i, i);
            }

            // Reduce longest change span
            k = i;
            l = m.length;
            i = 0;
            j = 0;
            while (i < l) {
                op = m[i][j].type;
                r = f(r, op, i + k, j + k);

                switch (op) {
                    case SKIP:
                        ++i;++j;break;
                    case RIGHT:
                        ++j;break;
                    case DOWN:
                        ++i;break;
                }
            }

            // Reduce shared suffix
            i += k;
            j += k;
            l = lcs.suffix;
            for (k = 0; k < l; ++k) {
                r = f(r, SKIP, i + k, j + k);
            }

            return r;
        }

        function findPrefix(a, b) {
            var i = 0;
            var l = Math.min(a.length, b.length);
            while (i < l && a[i] === b[i]) {
                ++i;
            }
            return i;
        }

        function findSuffix(a, b) {
            var al = a.length - 1;
            var bl = b.length - 1;
            var l = Math.min(al, bl);
            var i = 0;
            while (i < l && a[al - i] === b[bl - i]) {
                ++i;
            }
            return i;
        }

        function backtrack(matrix, a, b, start, j, i) {
            if (a[j + start] === b[i + start]) {
                return { value: matrix[i + 1][j + 1].value, type: SKIP };
            }
            if (matrix[i][j + 1].value < matrix[i + 1][j].value) {
                return { value: matrix[i][j + 1].value + 1, type: RIGHT };
            }

            return { value: matrix[i + 1][j].value + 1, type: DOWN };
        }

        function createMatrix(cols, rows) {
            var m = [],
                i,
                j,
                lastrow;

            // Fill the last row
            lastrow = m[rows] = [];
            for (j = 0; j < cols; ++j) {
                lastrow[j] = { value: cols - j, type: RIGHT };
            }

            // Fill the last col
            for (i = 0; i < rows; ++i) {
                m[i] = [];
                m[i][cols] = { value: rows - i, type: DOWN };
            }

            // Fill the last cell
            m[rows][cols] = { value: 0, type: SKIP };

            return m;
        }
    }, {}], 19: [function (require, module, exports) {
        var jsonPointer = require('./jsonPointer');
        var clone = require('./clone');
        var deepEquals = require('./deepEquals');
        var commutePaths = require('./commutePaths');

        var array = require('./array');

        var TestFailedError = require('./TestFailedError');
        var InvalidPatchOperationError = require('./InvalidPatchOperationError');
        var PatchNotInvertibleError = require('./PatchNotInvertibleError');

        var find = jsonPointer.find;
        var parseArrayIndex = jsonPointer.parseArrayIndex;

        exports.test = {
            apply: applyTest,
            inverse: invertTest,
            commute: commuteTest
        };

        exports.add = {
            apply: applyAdd,
            inverse: invertAdd,
            commute: commuteAddOrCopy
        };

        exports.remove = {
            apply: applyRemove,
            inverse: invertRemove,
            commute: commuteRemove
        };

        exports.replace = {
            apply: applyReplace,
            inverse: invertReplace,
            commute: commuteReplace
        };

        exports.move = {
            apply: applyMove,
            inverse: invertMove,
            commute: commuteMove
        };

        exports.copy = {
            apply: applyCopy,
            inverse: notInvertible,
            commute: commuteAddOrCopy
        };

        /**
         * Apply a test operation to x
         * @param {object|array} x
         * @param {object} test test operation
         * @throws {TestFailedError} if the test operation fails
         */

        function applyTest(x, test, options) {
            var pointer = find(x, test.path, options.findContext, test.context);
            var target = pointer.target;
            var index, value;

            if (Array.isArray(target)) {
                index = parseArrayIndex(pointer.key);
                //index = findIndex(options.findContext, index, target, test.context);
                value = target[index];
            } else {
                value = pointer.key === void 0 ? pointer.target : pointer.target[pointer.key];
            }

            if (!deepEquals(value, test.value)) {
                throw new TestFailedError('test failed ' + JSON.stringify(test));
            }

            return x;
        }

        /**
         * Invert the provided test and add it to the inverted patch sequence
         * @param pr
         * @param test
         * @returns {number}
         */
        function invertTest(pr, test) {
            pr.push(test);
            return 1;
        }

        function commuteTest(test, b) {
            if (test.path === b.path && b.op === 'remove') {
                throw new TypeError('Can\'t commute test,remove -> remove,test for same path');
            }

            if (b.op === 'test' || b.op === 'replace') {
                return [b, test];
            }

            return commutePaths(test, b);
        }

        /**
         * Apply an add operation to x
         * @param {object|array} x
         * @param {object} change add operation
         */
        function applyAdd(x, change, options) {
            var pointer = find(x, change.path, options.findContext, change.context);

            if (notFound(pointer)) {
                throw new InvalidPatchOperationError('path does not exist ' + change.path);
            }

            if (change.value === void 0) {
                throw new InvalidPatchOperationError('missing value');
            }

            var val = clone(change.value);

            // If pointer refers to whole document, replace whole document
            if (pointer.key === void 0) {
                return val;
            }

            _add(pointer, val);
            return x;
        }

        function _add(pointer, value) {
            var target = pointer.target;

            if (Array.isArray(target)) {
                // '-' indicates 'append' to array
                if (pointer.key === '-') {
                    target.push(value);
                } else if (pointer.key > target.length) {
                    throw new InvalidPatchOperationError('target of add outside of array bounds');
                } else {
                    target.splice(pointer.key, 0, value);
                }
            } else if (isValidObject(target)) {
                target[pointer.key] = value;
            } else {
                throw new InvalidPatchOperationError('target of add must be an object or array ' + pointer.key);
            }
        }

        function invertAdd(pr, add) {
            var context = add.context;
            if (context !== void 0) {
                context = {
                    before: context.before,
                    after: array.cons(add.value, context.after)
                };
            }
            pr.push({ op: 'test', path: add.path, value: add.value, context: context });
            pr.push({ op: 'remove', path: add.path, context: context });
            return 1;
        }

        function commuteAddOrCopy(add, b) {
            if (add.path === b.path && b.op === 'remove') {
                throw new TypeError('Can\'t commute add,remove -> remove,add for same path');
            }

            return commutePaths(add, b);
        }

        /**
         * Apply a replace operation to x
         * @param {object|array} x
         * @param {object} change replace operation
         */
        function applyReplace(x, change, options) {
            var pointer = find(x, change.path, options.findContext, change.context);

            if (notFound(pointer) || missingValue(pointer)) {
                throw new InvalidPatchOperationError('path does not exist ' + change.path);
            }

            if (change.value === void 0) {
                throw new InvalidPatchOperationError('missing value');
            }

            var value = clone(change.value);

            // If pointer refers to whole document, replace whole document
            if (pointer.key === void 0) {
                return value;
            }

            var target = pointer.target;

            if (Array.isArray(target)) {
                target[parseArrayIndex(pointer.key)] = value;
            } else {
                target[pointer.key] = value;
            }

            return x;
        }

        function invertReplace(pr, c, i, patch) {
            var prev = patch[i - 1];
            if (prev === void 0 || prev.op !== 'test' || prev.path !== c.path) {
                throw new PatchNotInvertibleError('cannot invert replace w/o test');
            }

            var context = prev.context;
            if (context !== void 0) {
                context = {
                    before: context.before,
                    after: array.cons(prev.value, array.tail(context.after))
                };
            }

            pr.push({ op: 'test', path: prev.path, value: c.value });
            pr.push({ op: 'replace', path: prev.path, value: prev.value });
            return 2;
        }

        function commuteReplace(replace, b) {
            if (replace.path === b.path && b.op === 'remove') {
                throw new TypeError('Can\'t commute replace,remove -> remove,replace for same path');
            }

            if (b.op === 'test' || b.op === 'replace') {
                return [b, replace];
            }

            return commutePaths(replace, b);
        }

        /**
         * Apply a remove operation to x
         * @param {object|array} x
         * @param {object} change remove operation
         */
        function applyRemove(x, change, options) {
            var pointer = find(x, change.path, options.findContext, change.context);

            // key must exist for remove
            if (notFound(pointer) || pointer.target[pointer.key] === void 0) {
                throw new InvalidPatchOperationError('path does not exist ' + change.path);
            }

            _remove(pointer);
            return x;
        }

        function _remove(pointer) {
            var target = pointer.target;

            var removed;
            if (Array.isArray(target)) {
                removed = target.splice(parseArrayIndex(pointer.key), 1);
                return removed[0];
            } else if (isValidObject(target)) {
                removed = target[pointer.key];
                delete target[pointer.key];
                return removed;
            } else {
                throw new InvalidPatchOperationError('target of remove must be an object or array');
            }
        }

        function invertRemove(pr, c, i, patch) {
            var prev = patch[i - 1];
            if (prev === void 0 || prev.op !== 'test' || prev.path !== c.path) {
                throw new PatchNotInvertibleError('cannot invert remove w/o test');
            }

            var context = prev.context;
            if (context !== void 0) {
                context = {
                    before: context.before,
                    after: array.tail(context.after)
                };
            }

            pr.push({ op: 'add', path: prev.path, value: prev.value, context: context });
            return 2;
        }

        function commuteRemove(remove, b) {
            if (remove.path === b.path && b.op === 'remove') {
                return [b, remove];
            }

            return commutePaths(remove, b);
        }

        /**
         * Apply a move operation to x
         * @param {object|array} x
         * @param {object} change move operation
         */
        function applyMove(x, change, options) {
            if (jsonPointer.contains(change.path, change.from)) {
                throw new InvalidPatchOperationError('move.from cannot be ancestor of move.path');
            }

            var pto = find(x, change.path, options.findContext, change.context);
            var pfrom = find(x, change.from, options.findContext, change.fromContext);

            _add(pto, _remove(pfrom));
            return x;
        }

        function invertMove(pr, c) {
            pr.push({ op: 'move',
                path: c.from, context: c.fromContext,
                from: c.path, fromContext: c.context });
            return 1;
        }

        function commuteMove(move, b) {
            if (move.path === b.path && b.op === 'remove') {
                throw new TypeError('Can\'t commute move,remove -> move,replace for same path');
            }

            return commutePaths(move, b);
        }

        /**
         * Apply a copy operation to x
         * @param {object|array} x
         * @param {object} change copy operation
         */
        function applyCopy(x, change, options) {
            var pto = find(x, change.path, options.findContext, change.context);
            var pfrom = find(x, change.from, options.findContext, change.fromContext);

            if (notFound(pfrom) || missingValue(pfrom)) {
                throw new InvalidPatchOperationError('copy.from must exist');
            }

            var target = pfrom.target;
            var value;

            if (Array.isArray(target)) {
                value = target[parseArrayIndex(pfrom.key)];
            } else {
                value = target[pfrom.key];
            }

            _add(pto, clone(value));
            return x;
        }

        // NOTE: Copy is not invertible
        // See https://github.com/cujojs/jiff/issues/9
        // This needs more thought. We may have to extend/amend JSON Patch.
        // At first glance, this seems like it should just be a remove.
        // However, that's not correct.  It violates the involution:
        // invert(invert(p)) ~= p.  For example:
        // invert(copy) -> remove
        // invert(remove) -> add
        // thus: invert(invert(copy)) -> add (DOH! this should be copy!)

        function notInvertible(_, c) {
            throw new PatchNotInvertibleError('cannot invert ' + c.op);
        }

        function notFound(pointer) {
            return pointer === void 0 || pointer.target == null && pointer.key !== void 0;
        }

        function missingValue(pointer) {
            return pointer.key !== void 0 && pointer.target[pointer.key] === void 0;
        }

        /**
         * Return true if x is a non-null object
         * @param {*} x
         * @returns {boolean}
         */
        function isValidObject(x) {
            return x !== null && (typeof x === "undefined" ? "undefined" : _typeof(x)) === 'object';
        }
    }, { "./InvalidPatchOperationError": 7, "./PatchNotInvertibleError": 8, "./TestFailedError": 9, "./array": 10, "./clone": 11, "./commutePaths": 12, "./deepEquals": 13, "./jsonPointer": 16 }], 20: [function (require, module, exports) {
        // shim for using process in browser
        var process = module.exports = {};

        // cached from whatever global is present so that test runners that stub it
        // don't break things.  But we need to wrap it in a try catch in case it is
        // wrapped in strict mode code which doesn't define any globals.  It's inside a
        // function because try/catches deoptimize in certain engines.

        var cachedSetTimeout;
        var cachedClearTimeout;

        function defaultSetTimout() {
            throw new Error('setTimeout has not been defined');
        }
        function defaultClearTimeout() {
            throw new Error('clearTimeout has not been defined');
        }
        (function () {
            try {
                if (typeof setTimeout === 'function') {
                    cachedSetTimeout = setTimeout;
                } else {
                    cachedSetTimeout = defaultSetTimout;
                }
            } catch (e) {
                cachedSetTimeout = defaultSetTimout;
            }
            try {
                if (typeof clearTimeout === 'function') {
                    cachedClearTimeout = clearTimeout;
                } else {
                    cachedClearTimeout = defaultClearTimeout;
                }
            } catch (e) {
                cachedClearTimeout = defaultClearTimeout;
            }
        })();
        function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
                //normal enviroments in sane situations
                return setTimeout(fun, 0);
            }
            // if setTimeout wasn't available but was latter defined
            if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                cachedSetTimeout = setTimeout;
                return setTimeout(fun, 0);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedSetTimeout(fun, 0);
            } catch (e) {
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                    return cachedSetTimeout.call(null, fun, 0);
                } catch (e) {
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                    return cachedSetTimeout.call(this, fun, 0);
                }
            }
        }
        function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
                //normal enviroments in sane situations
                return clearTimeout(marker);
            }
            // if clearTimeout wasn't available but was latter defined
            if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                cachedClearTimeout = clearTimeout;
                return clearTimeout(marker);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedClearTimeout(marker);
            } catch (e) {
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                    return cachedClearTimeout.call(null, marker);
                } catch (e) {
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                    // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                    return cachedClearTimeout.call(this, marker);
                }
            }
        }
        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;

        function cleanUpNextTick() {
            if (!draining || !currentQueue) {
                return;
            }
            draining = false;
            if (currentQueue.length) {
                queue = currentQueue.concat(queue);
            } else {
                queueIndex = -1;
            }
            if (queue.length) {
                drainQueue();
            }
        }

        function drainQueue() {
            if (draining) {
                return;
            }
            var timeout = runTimeout(cleanUpNextTick);
            draining = true;

            var len = queue.length;
            while (len) {
                currentQueue = queue;
                queue = [];
                while (++queueIndex < len) {
                    if (currentQueue) {
                        currentQueue[queueIndex].run();
                    }
                }
                queueIndex = -1;
                len = queue.length;
            }
            currentQueue = null;
            draining = false;
            runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
            var args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    args[i - 1] = arguments[i];
                }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
                runTimeout(drainQueue);
            }
        };

        // v8 likes predictible objects
        function Item(fun, array) {
            this.fun = fun;
            this.array = array;
        }
        Item.prototype.run = function () {
            this.fun.apply(null, this.array);
        };
        process.title = 'browser';
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ''; // empty string to avoid regexp issues
        process.versions = {};

        function noop() {}

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) {
            return [];
        };

        process.binding = function (name) {
            throw new Error('process.binding is not supported');
        };

        process.cwd = function () {
            return '/';
        };
        process.chdir = function (dir) {
            throw new Error('process.chdir is not supported');
        };
        process.umask = function () {
            return 0;
        };
    }, {}], 21: [function (require, module, exports) {
        (function (process) {
            // vim:ts=4:sts=4:sw=4:
            /*!
             *
             * Copyright 2009-2017 Kris Kowal under the terms of the MIT
             * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
             *
             * With parts by Tyler Close
             * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
             * at http://www.opensource.org/licenses/mit-license.html
             * Forked at ref_send.js version: 2009-05-11
             *
             * With parts by Mark Miller
             * Copyright (C) 2011 Google Inc.
             *
             * Licensed under the Apache License, Version 2.0 (the "License");
             * you may not use this file except in compliance with the License.
             * You may obtain a copy of the License at
             *
             * http://www.apache.org/licenses/LICENSE-2.0
             *
             * Unless required by applicable law or agreed to in writing, software
             * distributed under the License is distributed on an "AS IS" BASIS,
             * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
             * See the License for the specific language governing permissions and
             * limitations under the License.
             *
             */

            (function (definition) {
                "use strict";

                // This file will function properly as a <script> tag, or a module
                // using CommonJS and NodeJS or RequireJS module formats.  In
                // Common/Node/RequireJS, the module exports the Q API and when
                // executed as a simple <script>, it creates a Q global instead.

                // Montage Require

                if (typeof bootstrap === "function") {
                    bootstrap("promise", definition);

                    // CommonJS
                } else if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object" && (typeof module === "undefined" ? "undefined" : _typeof(module)) === "object") {
                    module.exports = definition();

                    // RequireJS
                } else if (typeof define === "function" && define.amd) {
                    define(definition);

                    // SES (Secure EcmaScript)
                } else if (typeof ses !== "undefined") {
                    if (!ses.ok()) {
                        return;
                    } else {
                        ses.makeQ = definition;
                    }

                    // <script>
                } else if (typeof window !== "undefined" || typeof self !== "undefined") {
                    // Prefer window over self for add-on scripts. Use self for
                    // non-windowed contexts.
                    var global = typeof window !== "undefined" ? window : self;

                    // Get the `window` object, save the previous Q global
                    // and initialize Q as a global.
                    var previousQ = global.Q;
                    global.Q = definition();

                    // Add a noConflict function so Q can be removed from the
                    // global namespace.
                    global.Q.noConflict = function () {
                        global.Q = previousQ;
                        return this;
                    };
                } else {
                    throw new Error("This environment was not anticipated by Q. Please file a bug.");
                }
            })(function () {
                "use strict";

                var hasStacks = false;
                try {
                    throw new Error();
                } catch (e) {
                    hasStacks = !!e.stack;
                }

                // All code after this point will be filtered from stack traces reported
                // by Q.
                var qStartingLine = captureLine();
                var qFileName;

                // shims

                // used for fallback in "allResolved"
                var noop = function noop() {};

                // Use the fastest possible means to execute a task in a future turn
                // of the event loop.
                var nextTick = function () {
                    // linked list of tasks (single, with head node)
                    var head = { task: void 0, next: null };
                    var tail = head;
                    var flushing = false;
                    var requestTick = void 0;
                    var isNodeJS = false;
                    // queue for late tasks, used by unhandled rejection tracking
                    var laterQueue = [];

                    function flush() {
                        /* jshint loopfunc: true */
                        var task, domain;

                        while (head.next) {
                            head = head.next;
                            task = head.task;
                            head.task = void 0;
                            domain = head.domain;

                            if (domain) {
                                head.domain = void 0;
                                domain.enter();
                            }
                            runSingle(task, domain);
                        }
                        while (laterQueue.length) {
                            task = laterQueue.pop();
                            runSingle(task);
                        }
                        flushing = false;
                    }
                    // runs a single function in the async queue
                    function runSingle(task, domain) {
                        try {
                            task();
                        } catch (e) {
                            if (isNodeJS) {
                                // In node, uncaught exceptions are considered fatal errors.
                                // Re-throw them synchronously to interrupt flushing!

                                // Ensure continuation if the uncaught exception is suppressed
                                // listening "uncaughtException" events (as domains does).
                                // Continue in next event to avoid tick recursion.
                                if (domain) {
                                    domain.exit();
                                }
                                setTimeout(flush, 0);
                                if (domain) {
                                    domain.enter();
                                }

                                throw e;
                            } else {
                                // In browsers, uncaught exceptions are not fatal.
                                // Re-throw them asynchronously to avoid slow-downs.
                                setTimeout(function () {
                                    throw e;
                                }, 0);
                            }
                        }

                        if (domain) {
                            domain.exit();
                        }
                    }

                    nextTick = function nextTick(task) {
                        tail = tail.next = {
                            task: task,
                            domain: isNodeJS && process.domain,
                            next: null
                        };

                        if (!flushing) {
                            flushing = true;
                            requestTick();
                        }
                    };

                    if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && process.toString() === "[object process]" && process.nextTick) {
                        // Ensure Q is in a real Node environment, with a `process.nextTick`.
                        // To see through fake Node environments:
                        // * Mocha test runner - exposes a `process` global without a `nextTick`
                        // * Browserify - exposes a `process.nexTick` function that uses
                        //   `setTimeout`. In this case `setImmediate` is preferred because
                        //    it is faster. Browserify's `process.toString()` yields
                        //   "[object Object]", while in a real Node environment
                        //   `process.toString()` yields "[object process]".
                        isNodeJS = true;

                        requestTick = function requestTick() {
                            process.nextTick(flush);
                        };
                    } else if (typeof setImmediate === "function") {
                        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
                        if (typeof window !== "undefined") {
                            requestTick = setImmediate.bind(window, flush);
                        } else {
                            requestTick = function requestTick() {
                                setImmediate(flush);
                            };
                        }
                    } else if (typeof MessageChannel !== "undefined") {
                        // modern browsers
                        // http://www.nonblocking.io/2011/06/windownexttick.html
                        var channel = new MessageChannel();
                        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
                        // working message ports the first time a page loads.
                        channel.port1.onmessage = function () {
                            requestTick = requestPortTick;
                            channel.port1.onmessage = flush;
                            flush();
                        };
                        var requestPortTick = function requestPortTick() {
                            // Opera requires us to provide a message payload, regardless of
                            // whether we use it.
                            channel.port2.postMessage(0);
                        };
                        requestTick = function requestTick() {
                            setTimeout(flush, 0);
                            requestPortTick();
                        };
                    } else {
                        // old browsers
                        requestTick = function requestTick() {
                            setTimeout(flush, 0);
                        };
                    }
                    // runs a task after all other tasks have been run
                    // this is useful for unhandled rejection tracking that needs to happen
                    // after all `then`d tasks have been run.
                    nextTick.runAfter = function (task) {
                        laterQueue.push(task);
                        if (!flushing) {
                            flushing = true;
                            requestTick();
                        }
                    };
                    return nextTick;
                }();

                // Attempt to make generics safe in the face of downstream
                // modifications.
                // There is no situation where this is necessary.
                // If you need a security guarantee, these primordials need to be
                // deeply frozen anyway, and if you don’t need a security guarantee,
                // this is just plain paranoid.
                // However, this **might** have the nice side-effect of reducing the size of
                // the minified code by reducing x.call() to merely x()
                // See Mark Miller’s explanation of what this does.
                // http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
                var call = Function.call;
                function uncurryThis(f) {
                    return function () {
                        return call.apply(f, arguments);
                    };
                }
                // This is equivalent, but slower:
                // uncurryThis = Function_bind.bind(Function_bind.call);
                // http://jsperf.com/uncurrythis

                var array_slice = uncurryThis(Array.prototype.slice);

                var array_reduce = uncurryThis(Array.prototype.reduce || function (callback, basis) {
                    var index = 0,
                        length = this.length;
                    // concerning the initial value, if one is not provided
                    if (arguments.length === 1) {
                        // seek to the first value in the array, accounting
                        // for the possibility that is is a sparse array
                        do {
                            if (index in this) {
                                basis = this[index++];
                                break;
                            }
                            if (++index >= length) {
                                throw new TypeError();
                            }
                        } while (1);
                    }
                    // reduce
                    for (; index < length; index++) {
                        // account for the possibility that the array is sparse
                        if (index in this) {
                            basis = callback(basis, this[index], index);
                        }
                    }
                    return basis;
                });

                var array_indexOf = uncurryThis(Array.prototype.indexOf || function (value) {
                    // not a very good shim, but good enough for our one use of it
                    for (var i = 0; i < this.length; i++) {
                        if (this[i] === value) {
                            return i;
                        }
                    }
                    return -1;
                });

                var array_map = uncurryThis(Array.prototype.map || function (callback, thisp) {
                    var self = this;
                    var collect = [];
                    array_reduce(self, function (undefined, value, index) {
                        collect.push(callback.call(thisp, value, index, self));
                    }, void 0);
                    return collect;
                });

                var object_create = Object.create || function (prototype) {
                    function Type() {}
                    Type.prototype = prototype;
                    return new Type();
                };

                var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
                    obj[prop] = descriptor.value;
                    return obj;
                };

                var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

                var object_keys = Object.keys || function (object) {
                    var keys = [];
                    for (var key in object) {
                        if (object_hasOwnProperty(object, key)) {
                            keys.push(key);
                        }
                    }
                    return keys;
                };

                var object_toString = uncurryThis(Object.prototype.toString);

                function isObject(value) {
                    return value === Object(value);
                }

                // generator related shims

                // FIXME: Remove this function once ES6 generators are in SpiderMonkey.
                function isStopIteration(exception) {
                    return object_toString(exception) === "[object StopIteration]" || exception instanceof QReturnValue;
                }

                // FIXME: Remove this helper and Q.return once ES6 generators are in
                // SpiderMonkey.
                var QReturnValue;
                if (typeof ReturnValue !== "undefined") {
                    QReturnValue = ReturnValue;
                } else {
                    QReturnValue = function QReturnValue(value) {
                        this.value = value;
                    };
                }

                // long stack traces

                var STACK_JUMP_SEPARATOR = "From previous event:";

                function makeStackTraceLong(error, promise) {
                    // If possible, transform the error stack trace by removing Node and Q
                    // cruft, then concatenating with the stack trace of `promise`. See #57.
                    if (hasStacks && promise.stack && (typeof error === "undefined" ? "undefined" : _typeof(error)) === "object" && error !== null && error.stack) {
                        var stacks = [];
                        for (var p = promise; !!p; p = p.source) {
                            if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
                                object_defineProperty(error, "__minimumStackCounter__", { value: p.stackCounter, configurable: true });
                                stacks.unshift(p.stack);
                            }
                        }
                        stacks.unshift(error.stack);

                        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
                        var stack = filterStackString(concatedStacks);
                        object_defineProperty(error, "stack", { value: stack, configurable: true });
                    }
                }

                function filterStackString(stackString) {
                    var lines = stackString.split("\n");
                    var desiredLines = [];
                    for (var i = 0; i < lines.length; ++i) {
                        var line = lines[i];

                        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
                            desiredLines.push(line);
                        }
                    }
                    return desiredLines.join("\n");
                }

                function isNodeFrame(stackLine) {
                    return stackLine.indexOf("(module.js:") !== -1 || stackLine.indexOf("(node.js:") !== -1;
                }

                function getFileNameAndLineNumber(stackLine) {
                    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
                    // In IE10 function name can have spaces ("Anonymous function") O_o
                    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
                    if (attempt1) {
                        return [attempt1[1], Number(attempt1[2])];
                    }

                    // Anonymous functions: "at filename:lineNumber:columnNumber"
                    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
                    if (attempt2) {
                        return [attempt2[1], Number(attempt2[2])];
                    }

                    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
                    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
                    if (attempt3) {
                        return [attempt3[1], Number(attempt3[2])];
                    }
                }

                function isInternalFrame(stackLine) {
                    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

                    if (!fileNameAndLineNumber) {
                        return false;
                    }

                    var fileName = fileNameAndLineNumber[0];
                    var lineNumber = fileNameAndLineNumber[1];

                    return fileName === qFileName && lineNumber >= qStartingLine && lineNumber <= qEndingLine;
                }

                // discover own file name and line number range for filtering stack
                // traces
                function captureLine() {
                    if (!hasStacks) {
                        return;
                    }

                    try {
                        throw new Error();
                    } catch (e) {
                        var lines = e.stack.split("\n");
                        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
                        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
                        if (!fileNameAndLineNumber) {
                            return;
                        }

                        qFileName = fileNameAndLineNumber[0];
                        return fileNameAndLineNumber[1];
                    }
                }

                function deprecate(callback, name, alternative) {
                    return function () {
                        if (typeof console !== "undefined" && typeof console.warn === "function") {
                            console.warn(name + " is deprecated, use " + alternative + " instead.", new Error("").stack);
                        }
                        return callback.apply(callback, arguments);
                    };
                }

                // end of shims
                // beginning of real work

                /**
                 * Constructs a promise for an immediate reference, passes promises through, or
                 * coerces promises from different systems.
                 * @param value immediate reference or promise
                 */
                function Q(value) {
                    // If the object is already a Promise, return it directly.  This enables
                    // the resolve function to both be used to created references from objects,
                    // but to tolerably coerce non-promises to promises.
                    if (value instanceof Promise) {
                        return value;
                    }

                    // assimilate thenables
                    if (isPromiseAlike(value)) {
                        return coerce(value);
                    } else {
                        return fulfill(value);
                    }
                }
                Q.resolve = Q;

                /**
                 * Performs a task in a future turn of the event loop.
                 * @param {Function} task
                 */
                Q.nextTick = nextTick;

                /**
                 * Controls whether or not long stack traces will be on
                 */
                Q.longStackSupport = false;

                /**
                 * The counter is used to determine the stopping point for building
                 * long stack traces. In makeStackTraceLong we walk backwards through
                 * the linked list of promises, only stacks which were created before
                 * the rejection are concatenated.
                 */
                var longStackCounter = 1;

                // enable long stacks if Q_DEBUG is set
                if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && process && process.env && process.env.Q_DEBUG) {
                    Q.longStackSupport = true;
                }

                /**
                 * Constructs a {promise, resolve, reject} object.
                 *
                 * `resolve` is a callback to invoke with a more resolved value for the
                 * promise. To fulfill the promise, invoke `resolve` with any value that is
                 * not a thenable. To reject the promise, invoke `resolve` with a rejected
                 * thenable, or invoke `reject` with the reason directly. To resolve the
                 * promise to another thenable, thus putting it in the same state, invoke
                 * `resolve` with that other thenable.
                 */
                Q.defer = defer;
                function defer() {
                    // if "messages" is an "Array", that indicates that the promise has not yet
                    // been resolved.  If it is "undefined", it has been resolved.  Each
                    // element of the messages array is itself an array of complete arguments to
                    // forward to the resolved promise.  We coerce the resolution value to a
                    // promise using the `resolve` function because it handles both fully
                    // non-thenable values and other thenables gracefully.
                    var messages = [],
                        progressListeners = [],
                        resolvedPromise;

                    var deferred = object_create(defer.prototype);
                    var promise = object_create(Promise.prototype);

                    promise.promiseDispatch = function (resolve, op, operands) {
                        var args = array_slice(arguments);
                        if (messages) {
                            messages.push(args);
                            if (op === "when" && operands[1]) {
                                // progress operand
                                progressListeners.push(operands[1]);
                            }
                        } else {
                            Q.nextTick(function () {
                                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
                            });
                        }
                    };

                    // XXX deprecated
                    promise.valueOf = function () {
                        if (messages) {
                            return promise;
                        }
                        var nearerValue = nearer(resolvedPromise);
                        if (isPromise(nearerValue)) {
                            resolvedPromise = nearerValue; // shorten chain
                        }
                        return nearerValue;
                    };

                    promise.inspect = function () {
                        if (!resolvedPromise) {
                            return { state: "pending" };
                        }
                        return resolvedPromise.inspect();
                    };

                    if (Q.longStackSupport && hasStacks) {
                        try {
                            throw new Error();
                        } catch (e) {
                            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
                            // accessor around; that causes memory leaks as per GH-111. Just
                            // reify the stack trace as a string ASAP.
                            //
                            // At the same time, cut off the first line; it's always just
                            // "[object Promise]\n", as per the `toString`.
                            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
                            promise.stackCounter = longStackCounter++;
                        }
                    }

                    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
                    // consolidating them into `become`, since otherwise we'd create new
                    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

                    function become(newPromise) {
                        resolvedPromise = newPromise;

                        if (Q.longStackSupport && hasStacks) {
                            // Only hold a reference to the new promise if long stacks
                            // are enabled to reduce memory usage
                            promise.source = newPromise;
                        }

                        array_reduce(messages, function (undefined, message) {
                            Q.nextTick(function () {
                                newPromise.promiseDispatch.apply(newPromise, message);
                            });
                        }, void 0);

                        messages = void 0;
                        progressListeners = void 0;
                    }

                    deferred.promise = promise;
                    deferred.resolve = function (value) {
                        if (resolvedPromise) {
                            return;
                        }

                        become(Q(value));
                    };

                    deferred.fulfill = function (value) {
                        if (resolvedPromise) {
                            return;
                        }

                        become(fulfill(value));
                    };
                    deferred.reject = function (reason) {
                        if (resolvedPromise) {
                            return;
                        }

                        become(reject(reason));
                    };
                    deferred.notify = function (progress) {
                        if (resolvedPromise) {
                            return;
                        }

                        array_reduce(progressListeners, function (undefined, progressListener) {
                            Q.nextTick(function () {
                                progressListener(progress);
                            });
                        }, void 0);
                    };

                    return deferred;
                }

                /**
                 * Creates a Node-style callback that will resolve or reject the deferred
                 * promise.
                 * @returns a nodeback
                 */
                defer.prototype.makeNodeResolver = function () {
                    var self = this;
                    return function (error, value) {
                        if (error) {
                            self.reject(error);
                        } else if (arguments.length > 2) {
                            self.resolve(array_slice(arguments, 1));
                        } else {
                            self.resolve(value);
                        }
                    };
                };

                /**
                 * @param resolver {Function} a function that returns nothing and accepts
                 * the resolve, reject, and notify functions for a deferred.
                 * @returns a promise that may be resolved with the given resolve and reject
                 * functions, or rejected by a thrown exception in resolver
                 */
                Q.Promise = promise; // ES6
                Q.promise = promise;
                function promise(resolver) {
                    if (typeof resolver !== "function") {
                        throw new TypeError("resolver must be a function.");
                    }
                    var deferred = defer();
                    try {
                        resolver(deferred.resolve, deferred.reject, deferred.notify);
                    } catch (reason) {
                        deferred.reject(reason);
                    }
                    return deferred.promise;
                }

                promise.race = race; // ES6
                promise.all = all; // ES6
                promise.reject = reject; // ES6
                promise.resolve = Q; // ES6

                // XXX experimental.  This method is a way to denote that a local value is
                // serializable and should be immediately dispatched to a remote upon request,
                // instead of passing a reference.
                Q.passByCopy = function (object) {
                    //freeze(object);
                    //passByCopies.set(object, true);
                    return object;
                };

                Promise.prototype.passByCopy = function () {
                    //freeze(object);
                    //passByCopies.set(object, true);
                    return this;
                };

                /**
                 * If two promises eventually fulfill to the same value, promises that value,
                 * but otherwise rejects.
                 * @param x {Any*}
                 * @param y {Any*}
                 * @returns {Any*} a promise for x and y if they are the same, but a rejection
                 * otherwise.
                 *
                 */
                Q.join = function (x, y) {
                    return Q(x).join(y);
                };

                Promise.prototype.join = function (that) {
                    return Q([this, that]).spread(function (x, y) {
                        if (x === y) {
                            // TODO: "===" should be Object.is or equiv
                            return x;
                        } else {
                            throw new Error("Q can't join: not the same: " + x + " " + y);
                        }
                    });
                };

                /**
                 * Returns a promise for the first of an array of promises to become settled.
                 * @param answers {Array[Any*]} promises to race
                 * @returns {Any*} the first promise to be settled
                 */
                Q.race = race;
                function race(answerPs) {
                    return promise(function (resolve, reject) {
                        // Switch to this once we can assume at least ES5
                        // answerPs.forEach(function (answerP) {
                        //     Q(answerP).then(resolve, reject);
                        // });
                        // Use this in the meantime
                        for (var i = 0, len = answerPs.length; i < len; i++) {
                            Q(answerPs[i]).then(resolve, reject);
                        }
                    });
                }

                Promise.prototype.race = function () {
                    return this.then(Q.race);
                };

                /**
                 * Constructs a Promise with a promise descriptor object and optional fallback
                 * function.  The descriptor contains methods like when(rejected), get(name),
                 * set(name, value), post(name, args), and delete(name), which all
                 * return either a value, a promise for a value, or a rejection.  The fallback
                 * accepts the operation name, a resolver, and any further arguments that would
                 * have been forwarded to the appropriate method above had a method been
                 * provided with the proper name.  The API makes no guarantees about the nature
                 * of the returned object, apart from that it is usable whereever promises are
                 * bought and sold.
                 */
                Q.makePromise = Promise;
                function Promise(descriptor, fallback, inspect) {
                    if (fallback === void 0) {
                        fallback = function fallback(op) {
                            return reject(new Error("Promise does not support operation: " + op));
                        };
                    }
                    if (inspect === void 0) {
                        inspect = function inspect() {
                            return { state: "unknown" };
                        };
                    }

                    var promise = object_create(Promise.prototype);

                    promise.promiseDispatch = function (resolve, op, args) {
                        var result;
                        try {
                            if (descriptor[op]) {
                                result = descriptor[op].apply(promise, args);
                            } else {
                                result = fallback.call(promise, op, args);
                            }
                        } catch (exception) {
                            result = reject(exception);
                        }
                        if (resolve) {
                            resolve(result);
                        }
                    };

                    promise.inspect = inspect;

                    // XXX deprecated `valueOf` and `exception` support
                    if (inspect) {
                        var inspected = inspect();
                        if (inspected.state === "rejected") {
                            promise.exception = inspected.reason;
                        }

                        promise.valueOf = function () {
                            var inspected = inspect();
                            if (inspected.state === "pending" || inspected.state === "rejected") {
                                return promise;
                            }
                            return inspected.value;
                        };
                    }

                    return promise;
                }

                Promise.prototype.toString = function () {
                    return "[object Promise]";
                };

                Promise.prototype.then = function (fulfilled, rejected, progressed) {
                    var self = this;
                    var deferred = defer();
                    var done = false; // ensure the untrusted promise makes at most a
                    // single call to one of the callbacks

                    function _fulfilled(value) {
                        try {
                            return typeof fulfilled === "function" ? fulfilled(value) : value;
                        } catch (exception) {
                            return reject(exception);
                        }
                    }

                    function _rejected(exception) {
                        if (typeof rejected === "function") {
                            makeStackTraceLong(exception, self);
                            try {
                                return rejected(exception);
                            } catch (newException) {
                                return reject(newException);
                            }
                        }
                        return reject(exception);
                    }

                    function _progressed(value) {
                        return typeof progressed === "function" ? progressed(value) : value;
                    }

                    Q.nextTick(function () {
                        self.promiseDispatch(function (value) {
                            if (done) {
                                return;
                            }
                            done = true;

                            deferred.resolve(_fulfilled(value));
                        }, "when", [function (exception) {
                            if (done) {
                                return;
                            }
                            done = true;

                            deferred.resolve(_rejected(exception));
                        }]);
                    });

                    // Progress propagator need to be attached in the current tick.
                    self.promiseDispatch(void 0, "when", [void 0, function (value) {
                        var newValue;
                        var threw = false;
                        try {
                            newValue = _progressed(value);
                        } catch (e) {
                            threw = true;
                            if (Q.onerror) {
                                Q.onerror(e);
                            } else {
                                throw e;
                            }
                        }

                        if (!threw) {
                            deferred.notify(newValue);
                        }
                    }]);

                    return deferred.promise;
                };

                Q.tap = function (promise, callback) {
                    return Q(promise).tap(callback);
                };

                /**
                 * Works almost like "finally", but not called for rejections.
                 * Original resolution value is passed through callback unaffected.
                 * Callback may return a promise that will be awaited for.
                 * @param {Function} callback
                 * @returns {Q.Promise}
                 * @example
                 * doSomething()
                 *   .then(...)
                 *   .tap(console.log)
                 *   .then(...);
                 */
                Promise.prototype.tap = function (callback) {
                    callback = Q(callback);

                    return this.then(function (value) {
                        return callback.fcall(value).thenResolve(value);
                    });
                };

                /**
                 * Registers an observer on a promise.
                 *
                 * Guarantees:
                 *
                 * 1. that fulfilled and rejected will be called only once.
                 * 2. that either the fulfilled callback or the rejected callback will be
                 *    called, but not both.
                 * 3. that fulfilled and rejected will not be called in this turn.
                 *
                 * @param value      promise or immediate reference to observe
                 * @param fulfilled  function to be called with the fulfilled value
                 * @param rejected   function to be called with the rejection exception
                 * @param progressed function to be called on any progress notifications
                 * @return promise for the return value from the invoked callback
                 */
                Q.when = when;
                function when(value, fulfilled, rejected, progressed) {
                    return Q(value).then(fulfilled, rejected, progressed);
                }

                Promise.prototype.thenResolve = function (value) {
                    return this.then(function () {
                        return value;
                    });
                };

                Q.thenResolve = function (promise, value) {
                    return Q(promise).thenResolve(value);
                };

                Promise.prototype.thenReject = function (reason) {
                    return this.then(function () {
                        throw reason;
                    });
                };

                Q.thenReject = function (promise, reason) {
                    return Q(promise).thenReject(reason);
                };

                /**
                 * If an object is not a promise, it is as "near" as possible.
                 * If a promise is rejected, it is as "near" as possible too.
                 * If it’s a fulfilled promise, the fulfillment value is nearer.
                 * If it’s a deferred promise and the deferred has been resolved, the
                 * resolution is "nearer".
                 * @param object
                 * @returns most resolved (nearest) form of the object
                 */

                // XXX should we re-do this?
                Q.nearer = nearer;
                function nearer(value) {
                    if (isPromise(value)) {
                        var inspected = value.inspect();
                        if (inspected.state === "fulfilled") {
                            return inspected.value;
                        }
                    }
                    return value;
                }

                /**
                 * @returns whether the given object is a promise.
                 * Otherwise it is a fulfilled value.
                 */
                Q.isPromise = isPromise;
                function isPromise(object) {
                    return object instanceof Promise;
                }

                Q.isPromiseAlike = isPromiseAlike;
                function isPromiseAlike(object) {
                    return isObject(object) && typeof object.then === "function";
                }

                /**
                 * @returns whether the given object is a pending promise, meaning not
                 * fulfilled or rejected.
                 */
                Q.isPending = isPending;
                function isPending(object) {
                    return isPromise(object) && object.inspect().state === "pending";
                }

                Promise.prototype.isPending = function () {
                    return this.inspect().state === "pending";
                };

                /**
                 * @returns whether the given object is a value or fulfilled
                 * promise.
                 */
                Q.isFulfilled = isFulfilled;
                function isFulfilled(object) {
                    return !isPromise(object) || object.inspect().state === "fulfilled";
                }

                Promise.prototype.isFulfilled = function () {
                    return this.inspect().state === "fulfilled";
                };

                /**
                 * @returns whether the given object is a rejected promise.
                 */
                Q.isRejected = isRejected;
                function isRejected(object) {
                    return isPromise(object) && object.inspect().state === "rejected";
                }

                Promise.prototype.isRejected = function () {
                    return this.inspect().state === "rejected";
                };

                //// BEGIN UNHANDLED REJECTION TRACKING

                // This promise library consumes exceptions thrown in handlers so they can be
                // handled by a subsequent promise.  The exceptions get added to this array when
                // they are created, and removed when they are handled.  Note that in ES6 or
                // shimmed environments, this would naturally be a `Set`.
                var unhandledReasons = [];
                var unhandledRejections = [];
                var reportedUnhandledRejections = [];
                var trackUnhandledRejections = true;

                function resetUnhandledRejections() {
                    unhandledReasons.length = 0;
                    unhandledRejections.length = 0;

                    if (!trackUnhandledRejections) {
                        trackUnhandledRejections = true;
                    }
                }

                function trackRejection(promise, reason) {
                    if (!trackUnhandledRejections) {
                        return;
                    }
                    if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && typeof process.emit === "function") {
                        Q.nextTick.runAfter(function () {
                            if (array_indexOf(unhandledRejections, promise) !== -1) {
                                process.emit("unhandledRejection", reason, promise);
                                reportedUnhandledRejections.push(promise);
                            }
                        });
                    }

                    unhandledRejections.push(promise);
                    if (reason && typeof reason.stack !== "undefined") {
                        unhandledReasons.push(reason.stack);
                    } else {
                        unhandledReasons.push("(no stack) " + reason);
                    }
                }

                function untrackRejection(promise) {
                    if (!trackUnhandledRejections) {
                        return;
                    }

                    var at = array_indexOf(unhandledRejections, promise);
                    if (at !== -1) {
                        if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && typeof process.emit === "function") {
                            Q.nextTick.runAfter(function () {
                                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                                if (atReport !== -1) {
                                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                                    reportedUnhandledRejections.splice(atReport, 1);
                                }
                            });
                        }
                        unhandledRejections.splice(at, 1);
                        unhandledReasons.splice(at, 1);
                    }
                }

                Q.resetUnhandledRejections = resetUnhandledRejections;

                Q.getUnhandledReasons = function () {
                    // Make a copy so that consumers can't interfere with our internal state.
                    return unhandledReasons.slice();
                };

                Q.stopUnhandledRejectionTracking = function () {
                    resetUnhandledRejections();
                    trackUnhandledRejections = false;
                };

                resetUnhandledRejections();

                //// END UNHANDLED REJECTION TRACKING

                /**
                 * Constructs a rejected promise.
                 * @param reason value describing the failure
                 */
                Q.reject = reject;
                function reject(reason) {
                    var rejection = Promise({
                        "when": function when(rejected) {
                            // note that the error has been handled
                            if (rejected) {
                                untrackRejection(this);
                            }
                            return rejected ? rejected(reason) : this;
                        }
                    }, function fallback() {
                        return this;
                    }, function inspect() {
                        return { state: "rejected", reason: reason };
                    });

                    // Note that the reason has not been handled.
                    trackRejection(rejection, reason);

                    return rejection;
                }

                /**
                 * Constructs a fulfilled promise for an immediate reference.
                 * @param value immediate reference
                 */
                Q.fulfill = fulfill;
                function fulfill(value) {
                    return Promise({
                        "when": function when() {
                            return value;
                        },
                        "get": function get(name) {
                            return value[name];
                        },
                        "set": function set(name, rhs) {
                            value[name] = rhs;
                        },
                        "delete": function _delete(name) {
                            delete value[name];
                        },
                        "post": function post(name, args) {
                            // Mark Miller proposes that post with no name should apply a
                            // promised function.
                            if (name === null || name === void 0) {
                                return value.apply(void 0, args);
                            } else {
                                return value[name].apply(value, args);
                            }
                        },
                        "apply": function apply(thisp, args) {
                            return value.apply(thisp, args);
                        },
                        "keys": function keys() {
                            return object_keys(value);
                        }
                    }, void 0, function inspect() {
                        return { state: "fulfilled", value: value };
                    });
                }

                /**
                 * Converts thenables to Q promises.
                 * @param promise thenable promise
                 * @returns a Q promise
                 */
                function coerce(promise) {
                    var deferred = defer();
                    Q.nextTick(function () {
                        try {
                            promise.then(deferred.resolve, deferred.reject, deferred.notify);
                        } catch (exception) {
                            deferred.reject(exception);
                        }
                    });
                    return deferred.promise;
                }

                /**
                 * Annotates an object such that it will never be
                 * transferred away from this process over any promise
                 * communication channel.
                 * @param object
                 * @returns promise a wrapping of that object that
                 * additionally responds to the "isDef" message
                 * without a rejection.
                 */
                Q.master = master;
                function master(object) {
                    return Promise({
                        "isDef": function isDef() {}
                    }, function fallback(op, args) {
                        return dispatch(object, op, args);
                    }, function () {
                        return Q(object).inspect();
                    });
                }

                /**
                 * Spreads the values of a promised array of arguments into the
                 * fulfillment callback.
                 * @param fulfilled callback that receives variadic arguments from the
                 * promised array
                 * @param rejected callback that receives the exception if the promise
                 * is rejected.
                 * @returns a promise for the return value or thrown exception of
                 * either callback.
                 */
                Q.spread = spread;
                function spread(value, fulfilled, rejected) {
                    return Q(value).spread(fulfilled, rejected);
                }

                Promise.prototype.spread = function (fulfilled, rejected) {
                    return this.all().then(function (array) {
                        return fulfilled.apply(void 0, array);
                    }, rejected);
                };

                /**
                 * The async function is a decorator for generator functions, turning
                 * them into asynchronous generators.  Although generators are only part
                 * of the newest ECMAScript 6 drafts, this code does not cause syntax
                 * errors in older engines.  This code should continue to work and will
                 * in fact improve over time as the language improves.
                 *
                 * ES6 generators are currently part of V8 version 3.19 with the
                 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
                 * for longer, but under an older Python-inspired form.  This function
                 * works on both kinds of generators.
                 *
                 * Decorates a generator function such that:
                 *  - it may yield promises
                 *  - execution will continue when that promise is fulfilled
                 *  - the value of the yield expression will be the fulfilled value
                 *  - it returns a promise for the return value (when the generator
                 *    stops iterating)
                 *  - the decorated function returns a promise for the return value
                 *    of the generator or the first rejected promise among those
                 *    yielded.
                 *  - if an error is thrown in the generator, it propagates through
                 *    every following yield until it is caught, or until it escapes
                 *    the generator function altogether, and is translated into a
                 *    rejection for the promise returned by the decorated generator.
                 */
                Q.async = async;
                function async(makeGenerator) {
                    return function () {
                        // when verb is "send", arg is a value
                        // when verb is "throw", arg is an exception
                        function continuer(verb, arg) {
                            var result;

                            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
                            // engine that has a deployed base of browsers that support generators.
                            // However, SM's generators use the Python-inspired semantics of
                            // outdated ES6 drafts.  We would like to support ES6, but we'd also
                            // like to make it possible to use generators in deployed browsers, so
                            // we also support Python-style generators.  At some point we can remove
                            // this block.

                            if (typeof StopIteration === "undefined") {
                                // ES6 Generators
                                try {
                                    result = generator[verb](arg);
                                } catch (exception) {
                                    return reject(exception);
                                }
                                if (result.done) {
                                    return Q(result.value);
                                } else {
                                    return when(result.value, callback, errback);
                                }
                            } else {
                                // SpiderMonkey Generators
                                // FIXME: Remove this case when SM does ES6 generators.
                                try {
                                    result = generator[verb](arg);
                                } catch (exception) {
                                    if (isStopIteration(exception)) {
                                        return Q(exception.value);
                                    } else {
                                        return reject(exception);
                                    }
                                }
                                return when(result, callback, errback);
                            }
                        }
                        var generator = makeGenerator.apply(this, arguments);
                        var callback = continuer.bind(continuer, "next");
                        var errback = continuer.bind(continuer, "throw");
                        return callback();
                    };
                }

                /**
                 * The spawn function is a small wrapper around async that immediately
                 * calls the generator and also ends the promise chain, so that any
                 * unhandled errors are thrown instead of forwarded to the error
                 * handler. This is useful because it's extremely common to run
                 * generators at the top-level to work with libraries.
                 */
                Q.spawn = spawn;
                function spawn(makeGenerator) {
                    Q.done(Q.async(makeGenerator)());
                }

                // FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
                /**
                 * Throws a ReturnValue exception to stop an asynchronous generator.
                 *
                 * This interface is a stop-gap measure to support generator return
                 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
                 * generators like Chromium 29, just use "return" in your generator
                 * functions.
                 *
                 * @param value the return value for the surrounding generator
                 * @throws ReturnValue exception with the value.
                 * @example
                 * // ES6 style
                 * Q.async(function* () {
                 *      var foo = yield getFooPromise();
                 *      var bar = yield getBarPromise();
                 *      return foo + bar;
                 * })
                 * // Older SpiderMonkey style
                 * Q.async(function () {
                 *      var foo = yield getFooPromise();
                 *      var bar = yield getBarPromise();
                 *      Q.return(foo + bar);
                 * })
                 */
                Q["return"] = _return;
                function _return(value) {
                    throw new QReturnValue(value);
                }

                /**
                 * The promised function decorator ensures that any promise arguments
                 * are settled and passed as values (`this` is also settled and passed
                 * as a value).  It will also ensure that the result of a function is
                 * always a promise.
                 *
                 * @example
                 * var add = Q.promised(function (a, b) {
                 *     return a + b;
                 * });
                 * add(Q(a), Q(B));
                 *
                 * @param {function} callback The function to decorate
                 * @returns {function} a function that has been decorated.
                 */
                Q.promised = promised;
                function promised(callback) {
                    return function () {
                        return spread([this, all(arguments)], function (self, args) {
                            return callback.apply(self, args);
                        });
                    };
                }

                /**
                 * sends a message to a value in a future turn
                 * @param object* the recipient
                 * @param op the name of the message operation, e.g., "when",
                 * @param args further arguments to be forwarded to the operation
                 * @returns result {Promise} a promise for the result of the operation
                 */
                Q.dispatch = dispatch;
                function dispatch(object, op, args) {
                    return Q(object).dispatch(op, args);
                }

                Promise.prototype.dispatch = function (op, args) {
                    var self = this;
                    var deferred = defer();
                    Q.nextTick(function () {
                        self.promiseDispatch(deferred.resolve, op, args);
                    });
                    return deferred.promise;
                };

                /**
                 * Gets the value of a property in a future turn.
                 * @param object    promise or immediate reference for target object
                 * @param name      name of property to get
                 * @return promise for the property value
                 */
                Q.get = function (object, key) {
                    return Q(object).dispatch("get", [key]);
                };

                Promise.prototype.get = function (key) {
                    return this.dispatch("get", [key]);
                };

                /**
                 * Sets the value of a property in a future turn.
                 * @param object    promise or immediate reference for object object
                 * @param name      name of property to set
                 * @param value     new value of property
                 * @return promise for the return value
                 */
                Q.set = function (object, key, value) {
                    return Q(object).dispatch("set", [key, value]);
                };

                Promise.prototype.set = function (key, value) {
                    return this.dispatch("set", [key, value]);
                };

                /**
                 * Deletes a property in a future turn.
                 * @param object    promise or immediate reference for target object
                 * @param name      name of property to delete
                 * @return promise for the return value
                 */
                Q.del = // XXX legacy
                Q["delete"] = function (object, key) {
                    return Q(object).dispatch("delete", [key]);
                };

                Promise.prototype.del = // XXX legacy
                Promise.prototype["delete"] = function (key) {
                    return this.dispatch("delete", [key]);
                };

                /**
                 * Invokes a method in a future turn.
                 * @param object    promise or immediate reference for target object
                 * @param name      name of method to invoke
                 * @param value     a value to post, typically an array of
                 *                  invocation arguments for promises that
                 *                  are ultimately backed with `resolve` values,
                 *                  as opposed to those backed with URLs
                 *                  wherein the posted value can be any
                 *                  JSON serializable object.
                 * @return promise for the return value
                 */
                // bound locally because it is used by other methods
                Q.mapply = // XXX As proposed by "Redsandro"
                Q.post = function (object, name, args) {
                    return Q(object).dispatch("post", [name, args]);
                };

                Promise.prototype.mapply = // XXX As proposed by "Redsandro"
                Promise.prototype.post = function (name, args) {
                    return this.dispatch("post", [name, args]);
                };

                /**
                 * Invokes a method in a future turn.
                 * @param object    promise or immediate reference for target object
                 * @param name      name of method to invoke
                 * @param ...args   array of invocation arguments
                 * @return promise for the return value
                 */
                Q.send = // XXX Mark Miller's proposed parlance
                Q.mcall = // XXX As proposed by "Redsandro"
                Q.invoke = function (object, name /*...args*/) {
                    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
                };

                Promise.prototype.send = // XXX Mark Miller's proposed parlance
                Promise.prototype.mcall = // XXX As proposed by "Redsandro"
                Promise.prototype.invoke = function (name /*...args*/) {
                    return this.dispatch("post", [name, array_slice(arguments, 1)]);
                };

                /**
                 * Applies the promised function in a future turn.
                 * @param object    promise or immediate reference for target function
                 * @param args      array of application arguments
                 */
                Q.fapply = function (object, args) {
                    return Q(object).dispatch("apply", [void 0, args]);
                };

                Promise.prototype.fapply = function (args) {
                    return this.dispatch("apply", [void 0, args]);
                };

                /**
                 * Calls the promised function in a future turn.
                 * @param object    promise or immediate reference for target function
                 * @param ...args   array of application arguments
                 */
                Q["try"] = Q.fcall = function (object /* ...args*/) {
                    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
                };

                Promise.prototype.fcall = function () /*...args*/{
                    return this.dispatch("apply", [void 0, array_slice(arguments)]);
                };

                /**
                 * Binds the promised function, transforming return values into a fulfilled
                 * promise and thrown errors into a rejected one.
                 * @param object    promise or immediate reference for target function
                 * @param ...args   array of application arguments
                 */
                Q.fbind = function (object /*...args*/) {
                    var promise = Q(object);
                    var args = array_slice(arguments, 1);
                    return function fbound() {
                        return promise.dispatch("apply", [this, args.concat(array_slice(arguments))]);
                    };
                };
                Promise.prototype.fbind = function () /*...args*/{
                    var promise = this;
                    var args = array_slice(arguments);
                    return function fbound() {
                        return promise.dispatch("apply", [this, args.concat(array_slice(arguments))]);
                    };
                };

                /**
                 * Requests the names of the owned properties of a promised
                 * object in a future turn.
                 * @param object    promise or immediate reference for target object
                 * @return promise for the keys of the eventually settled object
                 */
                Q.keys = function (object) {
                    return Q(object).dispatch("keys", []);
                };

                Promise.prototype.keys = function () {
                    return this.dispatch("keys", []);
                };

                /**
                 * Turns an array of promises into a promise for an array.  If any of
                 * the promises gets rejected, the whole array is rejected immediately.
                 * @param {Array*} an array (or promise for an array) of values (or
                 * promises for values)
                 * @returns a promise for an array of the corresponding values
                 */
                // By Mark Miller
                // http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
                Q.all = all;
                function all(promises) {
                    return when(promises, function (promises) {
                        var pendingCount = 0;
                        var deferred = defer();
                        array_reduce(promises, function (undefined, promise, index) {
                            var snapshot;
                            if (isPromise(promise) && (snapshot = promise.inspect()).state === "fulfilled") {
                                promises[index] = snapshot.value;
                            } else {
                                ++pendingCount;
                                when(promise, function (value) {
                                    promises[index] = value;
                                    if (--pendingCount === 0) {
                                        deferred.resolve(promises);
                                    }
                                }, deferred.reject, function (progress) {
                                    deferred.notify({ index: index, value: progress });
                                });
                            }
                        }, void 0);
                        if (pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                        return deferred.promise;
                    });
                }

                Promise.prototype.all = function () {
                    return all(this);
                };

                /**
                 * Returns the first resolved promise of an array. Prior rejected promises are
                 * ignored.  Rejects only if all promises are rejected.
                 * @param {Array*} an array containing values or promises for values
                 * @returns a promise fulfilled with the value of the first resolved promise,
                 * or a rejected promise if all promises are rejected.
                 */
                Q.any = any;

                function any(promises) {
                    if (promises.length === 0) {
                        return Q.resolve();
                    }

                    var deferred = Q.defer();
                    var pendingCount = 0;
                    array_reduce(promises, function (prev, current, index) {
                        var promise = promises[index];

                        pendingCount++;

                        when(promise, onFulfilled, onRejected, onProgress);
                        function onFulfilled(result) {
                            deferred.resolve(result);
                        }
                        function onRejected(err) {
                            pendingCount--;
                            if (pendingCount === 0) {
                                err.message = "Q can't get fulfillment value from any promise, all " + "promises were rejected. Last error message: " + err.message;
                                deferred.reject(err);
                            }
                        }
                        function onProgress(progress) {
                            deferred.notify({
                                index: index,
                                value: progress
                            });
                        }
                    }, undefined);

                    return deferred.promise;
                }

                Promise.prototype.any = function () {
                    return any(this);
                };

                /**
                 * Waits for all promises to be settled, either fulfilled or
                 * rejected.  This is distinct from `all` since that would stop
                 * waiting at the first rejection.  The promise returned by
                 * `allResolved` will never be rejected.
                 * @param promises a promise for an array (or an array) of promises
                 * (or values)
                 * @return a promise for an array of promises
                 */
                Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
                function allResolved(promises) {
                    return when(promises, function (promises) {
                        promises = array_map(promises, Q);
                        return when(all(array_map(promises, function (promise) {
                            return when(promise, noop, noop);
                        })), function () {
                            return promises;
                        });
                    });
                }

                Promise.prototype.allResolved = function () {
                    return allResolved(this);
                };

                /**
                 * @see Promise#allSettled
                 */
                Q.allSettled = allSettled;
                function allSettled(promises) {
                    return Q(promises).allSettled();
                }

                /**
                 * Turns an array of promises into a promise for an array of their states (as
                 * returned by `inspect`) when they have all settled.
                 * @param {Array[Any*]} values an array (or promise for an array) of values (or
                 * promises for values)
                 * @returns {Array[State]} an array of states for the respective values.
                 */
                Promise.prototype.allSettled = function () {
                    return this.then(function (promises) {
                        return all(array_map(promises, function (promise) {
                            promise = Q(promise);
                            function regardless() {
                                return promise.inspect();
                            }
                            return promise.then(regardless, regardless);
                        }));
                    });
                };

                /**
                 * Captures the failure of a promise, giving an oportunity to recover
                 * with a callback.  If the given promise is fulfilled, the returned
                 * promise is fulfilled.
                 * @param {Any*} promise for something
                 * @param {Function} callback to fulfill the returned promise if the
                 * given promise is rejected
                 * @returns a promise for the return value of the callback
                 */
                Q.fail = // XXX legacy
                Q["catch"] = function (object, rejected) {
                    return Q(object).then(void 0, rejected);
                };

                Promise.prototype.fail = // XXX legacy
                Promise.prototype["catch"] = function (rejected) {
                    return this.then(void 0, rejected);
                };

                /**
                 * Attaches a listener that can respond to progress notifications from a
                 * promise's originating deferred. This listener receives the exact arguments
                 * passed to ``deferred.notify``.
                 * @param {Any*} promise for something
                 * @param {Function} callback to receive any progress notifications
                 * @returns the given promise, unchanged
                 */
                Q.progress = progress;
                function progress(object, progressed) {
                    return Q(object).then(void 0, void 0, progressed);
                }

                Promise.prototype.progress = function (progressed) {
                    return this.then(void 0, void 0, progressed);
                };

                /**
                 * Provides an opportunity to observe the settling of a promise,
                 * regardless of whether the promise is fulfilled or rejected.  Forwards
                 * the resolution to the returned promise when the callback is done.
                 * The callback can return a promise to defer completion.
                 * @param {Any*} promise
                 * @param {Function} callback to observe the resolution of the given
                 * promise, takes no arguments.
                 * @returns a promise for the resolution of the given promise when
                 * ``fin`` is done.
                 */
                Q.fin = // XXX legacy
                Q["finally"] = function (object, callback) {
                    return Q(object)["finally"](callback);
                };

                Promise.prototype.fin = // XXX legacy
                Promise.prototype["finally"] = function (callback) {
                    if (!callback || typeof callback.apply !== "function") {
                        throw new Error("Q can't apply finally callback");
                    }
                    callback = Q(callback);
                    return this.then(function (value) {
                        return callback.fcall().then(function () {
                            return value;
                        });
                    }, function (reason) {
                        // TODO attempt to recycle the rejection with "this".
                        return callback.fcall().then(function () {
                            throw reason;
                        });
                    });
                };

                /**
                 * Terminates a chain of promises, forcing rejections to be
                 * thrown as exceptions.
                 * @param {Any*} promise at the end of a chain of promises
                 * @returns nothing
                 */
                Q.done = function (object, fulfilled, rejected, progress) {
                    return Q(object).done(fulfilled, rejected, progress);
                };

                Promise.prototype.done = function (fulfilled, rejected, progress) {
                    var onUnhandledError = function onUnhandledError(error) {
                        // forward to a future turn so that ``when``
                        // does not catch it and turn it into a rejection.
                        Q.nextTick(function () {
                            makeStackTraceLong(error, promise);
                            if (Q.onerror) {
                                Q.onerror(error);
                            } else {
                                throw error;
                            }
                        });
                    };

                    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
                    var promise = fulfilled || rejected || progress ? this.then(fulfilled, rejected, progress) : this;

                    if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && process && process.domain) {
                        onUnhandledError = process.domain.bind(onUnhandledError);
                    }

                    promise.then(void 0, onUnhandledError);
                };

                /**
                 * Causes a promise to be rejected if it does not get fulfilled before
                 * some milliseconds time out.
                 * @param {Any*} promise
                 * @param {Number} milliseconds timeout
                 * @param {Any*} custom error message or Error object (optional)
                 * @returns a promise for the resolution of the given promise if it is
                 * fulfilled before the timeout, otherwise rejected.
                 */
                Q.timeout = function (object, ms, error) {
                    return Q(object).timeout(ms, error);
                };

                Promise.prototype.timeout = function (ms, error) {
                    var deferred = defer();
                    var timeoutId = setTimeout(function () {
                        if (!error || "string" === typeof error) {
                            error = new Error(error || "Timed out after " + ms + " ms");
                            error.code = "ETIMEDOUT";
                        }
                        deferred.reject(error);
                    }, ms);

                    this.then(function (value) {
                        clearTimeout(timeoutId);
                        deferred.resolve(value);
                    }, function (exception) {
                        clearTimeout(timeoutId);
                        deferred.reject(exception);
                    }, deferred.notify);

                    return deferred.promise;
                };

                /**
                 * Returns a promise for the given value (or promised value), some
                 * milliseconds after it resolved. Passes rejections immediately.
                 * @param {Any*} promise
                 * @param {Number} milliseconds
                 * @returns a promise for the resolution of the given promise after milliseconds
                 * time has elapsed since the resolution of the given promise.
                 * If the given promise rejects, that is passed immediately.
                 */
                Q.delay = function (object, timeout) {
                    if (timeout === void 0) {
                        timeout = object;
                        object = void 0;
                    }
                    return Q(object).delay(timeout);
                };

                Promise.prototype.delay = function (timeout) {
                    return this.then(function (value) {
                        var deferred = defer();
                        setTimeout(function () {
                            deferred.resolve(value);
                        }, timeout);
                        return deferred.promise;
                    });
                };

                /**
                 * Passes a continuation to a Node function, which is called with the given
                 * arguments provided as an array, and returns a promise.
                 *
                 *      Q.nfapply(FS.readFile, [__filename])
                 *      .then(function (content) {
                 *      })
                 *
                 */
                Q.nfapply = function (callback, args) {
                    return Q(callback).nfapply(args);
                };

                Promise.prototype.nfapply = function (args) {
                    var deferred = defer();
                    var nodeArgs = array_slice(args);
                    nodeArgs.push(deferred.makeNodeResolver());
                    this.fapply(nodeArgs).fail(deferred.reject);
                    return deferred.promise;
                };

                /**
                 * Passes a continuation to a Node function, which is called with the given
                 * arguments provided individually, and returns a promise.
                 * @example
                 * Q.nfcall(FS.readFile, __filename)
                 * .then(function (content) {
                 * })
                 *
                 */
                Q.nfcall = function (callback /*...args*/) {
                    var args = array_slice(arguments, 1);
                    return Q(callback).nfapply(args);
                };

                Promise.prototype.nfcall = function () /*...args*/{
                    var nodeArgs = array_slice(arguments);
                    var deferred = defer();
                    nodeArgs.push(deferred.makeNodeResolver());
                    this.fapply(nodeArgs).fail(deferred.reject);
                    return deferred.promise;
                };

                /**
                 * Wraps a NodeJS continuation passing function and returns an equivalent
                 * version that returns a promise.
                 * @example
                 * Q.nfbind(FS.readFile, __filename)("utf-8")
                 * .then(console.log)
                 * .done()
                 */
                Q.nfbind = Q.denodeify = function (callback /*...args*/) {
                    if (callback === undefined) {
                        throw new Error("Q can't wrap an undefined function");
                    }
                    var baseArgs = array_slice(arguments, 1);
                    return function () {
                        var nodeArgs = baseArgs.concat(array_slice(arguments));
                        var deferred = defer();
                        nodeArgs.push(deferred.makeNodeResolver());
                        Q(callback).fapply(nodeArgs).fail(deferred.reject);
                        return deferred.promise;
                    };
                };

                Promise.prototype.nfbind = Promise.prototype.denodeify = function () /*...args*/{
                    var args = array_slice(arguments);
                    args.unshift(this);
                    return Q.denodeify.apply(void 0, args);
                };

                Q.nbind = function (callback, thisp /*...args*/) {
                    var baseArgs = array_slice(arguments, 2);
                    return function () {
                        var nodeArgs = baseArgs.concat(array_slice(arguments));
                        var deferred = defer();
                        nodeArgs.push(deferred.makeNodeResolver());
                        function bound() {
                            return callback.apply(thisp, arguments);
                        }
                        Q(bound).fapply(nodeArgs).fail(deferred.reject);
                        return deferred.promise;
                    };
                };

                Promise.prototype.nbind = function () /*thisp, ...args*/{
                    var args = array_slice(arguments, 0);
                    args.unshift(this);
                    return Q.nbind.apply(void 0, args);
                };

                /**
                 * Calls a method of a Node-style object that accepts a Node-style
                 * callback with a given array of arguments, plus a provided callback.
                 * @param object an object that has the named method
                 * @param {String} name name of the method of object
                 * @param {Array} args arguments to pass to the method; the callback
                 * will be provided by Q and appended to these arguments.
                 * @returns a promise for the value or error
                 */
                Q.nmapply = // XXX As proposed by "Redsandro"
                Q.npost = function (object, name, args) {
                    return Q(object).npost(name, args);
                };

                Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
                Promise.prototype.npost = function (name, args) {
                    var nodeArgs = array_slice(args || []);
                    var deferred = defer();
                    nodeArgs.push(deferred.makeNodeResolver());
                    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
                    return deferred.promise;
                };

                /**
                 * Calls a method of a Node-style object that accepts a Node-style
                 * callback, forwarding the given variadic arguments, plus a provided
                 * callback argument.
                 * @param object an object that has the named method
                 * @param {String} name name of the method of object
                 * @param ...args arguments to pass to the method; the callback will
                 * be provided by Q and appended to these arguments.
                 * @returns a promise for the value or error
                 */
                Q.nsend = // XXX Based on Mark Miller's proposed "send"
                Q.nmcall = // XXX Based on "Redsandro's" proposal
                Q.ninvoke = function (object, name /*...args*/) {
                    var nodeArgs = array_slice(arguments, 2);
                    var deferred = defer();
                    nodeArgs.push(deferred.makeNodeResolver());
                    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
                    return deferred.promise;
                };

                Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
                Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
                Promise.prototype.ninvoke = function (name /*...args*/) {
                    var nodeArgs = array_slice(arguments, 1);
                    var deferred = defer();
                    nodeArgs.push(deferred.makeNodeResolver());
                    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
                    return deferred.promise;
                };

                /**
                 * If a function would like to support both Node continuation-passing-style and
                 * promise-returning-style, it can end its internal promise chain with
                 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
                 * elects to use a nodeback, the result will be sent there.  If they do not
                 * pass a nodeback, they will receive the result promise.
                 * @param object a result (or a promise for a result)
                 * @param {Function} nodeback a Node.js-style callback
                 * @returns either the promise or nothing
                 */
                Q.nodeify = nodeify;
                function nodeify(object, nodeback) {
                    return Q(object).nodeify(nodeback);
                }

                Promise.prototype.nodeify = function (nodeback) {
                    if (nodeback) {
                        this.then(function (value) {
                            Q.nextTick(function () {
                                nodeback(null, value);
                            });
                        }, function (error) {
                            Q.nextTick(function () {
                                nodeback(error);
                            });
                        });
                    } else {
                        return this;
                    }
                };

                Q.noConflict = function () {
                    throw new Error("Q.noConflict only works when Q is used as a global");
                };

                // All code before this point will be filtered from stack traces.
                var qEndingLine = captureLine();

                return Q;
            });
        }).call(this, require('_process'));
    }, { "_process": 20 }], 22: [function (require, module, exports) {
        var _global = function () {
            return this;
        }();
        var NativeWebSocket = _global.WebSocket || _global.MozWebSocket;
        var websocket_version = require('./version');

        /**
         * Expose a W3C WebSocket class with just one or two arguments.
         */
        function W3CWebSocket(uri, protocols) {
            var native_instance;

            if (protocols) {
                native_instance = new NativeWebSocket(uri, protocols);
            } else {
                native_instance = new NativeWebSocket(uri);
            }

            /**
             * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
             * class). Since it is an Object it will be returned as it is when creating an
             * instance of W3CWebSocket via 'new W3CWebSocket()'.
             *
             * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
             */
            return native_instance;
        }

        /**
         * Module exports.
         */
        module.exports = {
            'w3cwebsocket': NativeWebSocket ? W3CWebSocket : null,
            'version': websocket_version
        };
    }, { "./version": 23 }], 23: [function (require, module, exports) {
        module.exports = require('../package.json').version;
    }, { "../package.json": 24 }], 24: [function (require, module, exports) {
        module.exports = {
            "_args": [["websocket@1.0.24", "/opt/ashamed"]],
            "_from": "websocket@1.0.24",
            "_id": "websocket@1.0.24",
            "_inBundle": false,
            "_integrity": "sha1-dJA+dfJUW2suHeFCW8HJBZF6GJA=",
            "_location": "/websocket",
            "_phantomChildren": {},
            "_requested": {
                "type": "version",
                "registry": true,
                "raw": "websocket@1.0.24",
                "name": "websocket",
                "escapedName": "websocket",
                "rawSpec": "1.0.24",
                "saveSpec": null,
                "fetchSpec": "1.0.24"
            },
            "_requiredBy": ["/"],
            "_resolved": "https://registry.npmjs.org/websocket/-/websocket-1.0.24.tgz",
            "_spec": "1.0.24",
            "_where": "/opt/ashamed",
            "author": {
                "name": "Brian McKelvey",
                "email": "brian@worlize.com",
                "url": "https://www.worlize.com/"
            },
            "browser": "lib/browser.js",
            "bugs": {
                "url": "https://github.com/theturtle32/WebSocket-Node/issues"
            },
            "config": {
                "verbose": false
            },
            "contributors": [{
                "name": "Iñaki Baz Castillo",
                "email": "ibc@aliax.net",
                "url": "http://dev.sipdoc.net"
            }],
            "dependencies": {
                "debug": "^2.2.0",
                "nan": "^2.3.3",
                "typedarray-to-buffer": "^3.1.2",
                "yaeti": "^0.0.6"
            },
            "description": "Websocket Client & Server Library implementing the WebSocket protocol as specified in RFC 6455.",
            "devDependencies": {
                "buffer-equal": "^1.0.0",
                "faucet": "^0.0.1",
                "gulp": "git+https://github.com/gulpjs/gulp.git#4.0",
                "gulp-jshint": "^2.0.4",
                "jshint": "^2.0.0",
                "jshint-stylish": "^2.2.1",
                "tape": "^4.0.1"
            },
            "directories": {
                "lib": "./lib"
            },
            "engines": {
                "node": ">=0.8.0"
            },
            "homepage": "https://github.com/theturtle32/WebSocket-Node",
            "keywords": ["websocket", "websockets", "socket", "networking", "comet", "push", "RFC-6455", "realtime", "server", "client"],
            "license": "Apache-2.0",
            "main": "index",
            "name": "websocket",
            "repository": {
                "type": "git",
                "url": "git+https://github.com/theturtle32/WebSocket-Node.git"
            },
            "scripts": {
                "gulp": "gulp",
                "install": "(node-gyp rebuild 2> builderror.log) || (exit 0)",
                "test": "faucet test/unit"
            },
            "version": "1.0.24"
        };
    }, {}] }, {}, [1]);
//# sourceMappingURL=angular-ashamed.js.map
