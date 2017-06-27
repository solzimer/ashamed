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

            shm.service("ashamedService", ["ashamedConfig", "$rootScope", function (config, $rootScope) {
                var client = new AshamedClient(config);

                client.on("message", function (msg) {
                    setTimeout(function () {
                        return $rootScope.$apply();
                    });
                });

                this.get = function (path, options) {
                    return client.get(path, options);
                };
            }]);
        })(window);
    }, { "../lib/client.js": 2 }], 2: [function (require, module, exports) {
        var q = require("q"),
            Path = require("./path.js"),
            extend = require("extend"),
            EventEmitter = require('events'),
            DeepDiff = require('deep-diff'),
            applyChange = DeepDiff.applyChange,
            strToPath = Path.strToPath,
            pathToStr = Path.pathToStr,
            getPath = Path.getPath;

        var WebSocketClient = typeof WebSocket !== "undefined" ? WebSocket : require('websocket').w3cwebsocket;

        var store = {};
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
            var _msg$args = _slicedToArray(msg.args, 2),
                path = _msg$args[0],
                changes = _msg$args[1];

            changes = changes || [];
            path = strToPath(path);

            // For each change
            changes.forEach(function (diff) {
                diff.path = [].concat(path).concat(diff.path);
                applyChange(store, {}, diff);
            });
        }

        function modelResponse(msg) {
            var cid = msg.cid;

            var _msg$args2 = _slicedToArray(msg.args, 2),
                err = _msg$args2[0],
                data = _msg$args2[1];

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
                        } else if (options.realtime) {
                            def.resolve(getPath(path, true, store, data));
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
                            def.resolve(getPath(path, true, store, data));
                        } else {
                            def.resolve(data);
                        }
                    });

                    return def.promise;
                }
            }, {
                key: "diff",
                value: function diff(changes) {
                    var def = q.defer();
                    var cid = "ws_" + Math.random();

                    this._send({ op: "diff", args: [changes] }, function (err, data) {
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
    }, { "./path.js": 3, "deep-diff": 4, "events": 5, "extend": 6, "q": 8, "websocket": 9 }], 3: [function (require, module, exports) {
        var extend = require("extend");

        function strToPath(path) {
            return Array.isArray(path) ? path : path.replace(/ /g, "").split("/").filter(function (s) {
                return s.length;
            });
        }

        function pathToStr(path) {
            var res = typeof path == "string" ? path : path.join("/");
            return res.startsWith("/") ? res : "/" + res;
        }

        function getPath(path, create, src, val) {
            var root = src || {};
            path = strToPath(path);
            if (!path.length) return root;
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

        module.exports = {
            strToPath: strToPath,
            pathToStr: pathToStr,
            getPath: getPath
        };
    }, { "extend": 6 }], 4: [function (require, module, exports) {
        (function (global) {
            (function (global, factory) {
                (typeof exports === "undefined" ? "undefined" : _typeof(exports)) === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.DeepDiff = factory();
            })(this, function () {
                'use strict';

                var $scope;
                var conflict;
                var conflictResolution = [];
                if ((typeof global === "undefined" ? "undefined" : _typeof(global)) === 'object' && global) {
                    $scope = global;
                } else if (typeof window !== 'undefined') {
                    $scope = window;
                } else {
                    $scope = {};
                }
                conflict = $scope.DeepDiff;
                if (conflict) {
                    conflictResolution.push(function () {
                        if ('undefined' !== typeof conflict && $scope.DeepDiff === accumulateDiff) {
                            $scope.DeepDiff = conflict;
                            conflict = undefined;
                        }
                    });
                }

                // nodejs compatible on server side and in the browser.
                function inherits(ctor, superCtor) {
                    ctor.super_ = superCtor;
                    ctor.prototype = Object.create(superCtor.prototype, {
                        constructor: {
                            value: ctor,
                            enumerable: false,
                            writable: true,
                            configurable: true
                        }
                    });
                }

                function Diff(kind, path) {
                    Object.defineProperty(this, 'kind', {
                        value: kind,
                        enumerable: true
                    });
                    if (path && path.length) {
                        Object.defineProperty(this, 'path', {
                            value: path,
                            enumerable: true
                        });
                    }
                }

                function DiffEdit(path, origin, value) {
                    DiffEdit.super_.call(this, 'E', path);
                    Object.defineProperty(this, 'lhs', {
                        value: origin,
                        enumerable: true
                    });
                    Object.defineProperty(this, 'rhs', {
                        value: value,
                        enumerable: true
                    });
                }
                inherits(DiffEdit, Diff);

                function DiffNew(path, value) {
                    DiffNew.super_.call(this, 'N', path);
                    Object.defineProperty(this, 'rhs', {
                        value: value,
                        enumerable: true
                    });
                }
                inherits(DiffNew, Diff);

                function DiffDeleted(path, value) {
                    DiffDeleted.super_.call(this, 'D', path);
                    Object.defineProperty(this, 'lhs', {
                        value: value,
                        enumerable: true
                    });
                }
                inherits(DiffDeleted, Diff);

                function DiffArray(path, index, item) {
                    DiffArray.super_.call(this, 'A', path);
                    Object.defineProperty(this, 'index', {
                        value: index,
                        enumerable: true
                    });
                    Object.defineProperty(this, 'item', {
                        value: item,
                        enumerable: true
                    });
                }
                inherits(DiffArray, Diff);

                function arrayRemove(arr, from, to) {
                    var rest = arr.slice((to || from) + 1 || arr.length);
                    arr.length = from < 0 ? arr.length + from : from;
                    arr.push.apply(arr, rest);
                    return arr;
                }

                function realTypeOf(subject) {
                    var type = typeof subject === "undefined" ? "undefined" : _typeof(subject);
                    if (type !== 'object') {
                        return type;
                    }

                    if (subject === Math) {
                        return 'math';
                    } else if (subject === null) {
                        return 'null';
                    } else if (Array.isArray(subject)) {
                        return 'array';
                    } else if (Object.prototype.toString.call(subject) === '[object Date]') {
                        return 'date';
                    } else if (typeof subject.toString === 'function' && /^\/.*\//.test(subject.toString())) {
                        return 'regexp';
                    }
                    return 'object';
                }

                function deepDiff(lhs, rhs, changes, prefilter, path, key, stack) {
                    path = path || [];
                    stack = stack || [];
                    var currentPath = path.slice(0);
                    if (typeof key !== 'undefined') {
                        if (prefilter) {
                            if (typeof prefilter === 'function' && prefilter(currentPath, key)) {
                                return;
                            } else if ((typeof prefilter === "undefined" ? "undefined" : _typeof(prefilter)) === 'object') {
                                if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) {
                                    return;
                                }
                                if (prefilter.normalize) {
                                    var alt = prefilter.normalize(currentPath, key, lhs, rhs);
                                    if (alt) {
                                        lhs = alt[0];
                                        rhs = alt[1];
                                    }
                                }
                            }
                        }
                        currentPath.push(key);
                    }

                    // Use string comparison for regexes
                    if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
                        lhs = lhs.toString();
                        rhs = rhs.toString();
                    }

                    var ltype = typeof lhs === "undefined" ? "undefined" : _typeof(lhs);
                    var rtype = typeof rhs === "undefined" ? "undefined" : _typeof(rhs);

                    var ldefined = ltype !== 'undefined' || stack && stack[stack.length - 1].lhs && stack[stack.length - 1].lhs.hasOwnProperty(key);
                    var rdefined = rtype !== 'undefined' || stack && stack[stack.length - 1].rhs && stack[stack.length - 1].rhs.hasOwnProperty(key);

                    if (!ldefined && rdefined) {
                        changes(new DiffNew(currentPath, rhs));
                    } else if (!rdefined && ldefined) {
                        changes(new DiffDeleted(currentPath, lhs));
                    } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
                        changes(new DiffEdit(currentPath, lhs, rhs));
                    } else if (realTypeOf(lhs) === 'date' && lhs - rhs !== 0) {
                        changes(new DiffEdit(currentPath, lhs, rhs));
                    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
                        if (!stack.filter(function (x) {
                            return x.lhs === lhs;
                        }).length) {
                            stack.push({ lhs: lhs, rhs: rhs });
                            if (Array.isArray(lhs)) {
                                var i,
                                    len = lhs.length;
                                for (i = 0; i < lhs.length; i++) {
                                    if (i >= rhs.length) {
                                        changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])));
                                    } else {
                                        deepDiff(lhs[i], rhs[i], changes, prefilter, currentPath, i, stack);
                                    }
                                }
                                while (i < rhs.length) {
                                    changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i++])));
                                }
                            } else {
                                var akeys = Object.keys(lhs);
                                var pkeys = Object.keys(rhs);
                                akeys.forEach(function (k, i) {
                                    var other = pkeys.indexOf(k);
                                    if (other >= 0) {
                                        deepDiff(lhs[k], rhs[k], changes, prefilter, currentPath, k, stack);
                                        pkeys = arrayRemove(pkeys, other);
                                    } else {
                                        deepDiff(lhs[k], undefined, changes, prefilter, currentPath, k, stack);
                                    }
                                });
                                pkeys.forEach(function (k) {
                                    deepDiff(undefined, rhs[k], changes, prefilter, currentPath, k, stack);
                                });
                            }
                            stack.length = stack.length - 1;
                        } else if (lhs !== rhs) {
                            // lhs is contains a cycle at this element and it differs from rhs
                            changes(new DiffEdit(currentPath, lhs, rhs));
                        }
                    } else if (lhs !== rhs) {
                        if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
                            changes(new DiffEdit(currentPath, lhs, rhs));
                        }
                    }
                }

                function accumulateDiff(lhs, rhs, prefilter, accum) {
                    accum = accum || [];
                    deepDiff(lhs, rhs, function (diff) {
                        if (diff) {
                            accum.push(diff);
                        }
                    }, prefilter);
                    return accum.length ? accum : undefined;
                }

                function applyArrayChange(arr, index, change) {
                    if (change.path && change.path.length) {
                        var it = arr[index],
                            i,
                            u = change.path.length - 1;
                        for (i = 0; i < u; i++) {
                            it = it[change.path[i]];
                        }
                        switch (change.kind) {
                            case 'A':
                                applyArrayChange(it[change.path[i]], change.index, change.item);
                                break;
                            case 'D':
                                delete it[change.path[i]];
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
                                arr = arrayRemove(arr, index);
                                break;
                            case 'E':
                            case 'N':
                                arr[index] = change.rhs;
                                break;
                        }
                    }
                    return arr;
                }

                function applyChange(target, source, change) {
                    if (target && source && change && change.kind) {
                        var it = target,
                            i = -1,
                            last = change.path ? change.path.length - 1 : 0;
                        while (++i < last) {
                            if (typeof it[change.path[i]] === 'undefined') {
                                it[change.path[i]] = typeof change.path[i] === 'number' ? [] : {};
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
                                it[change.path[i]] = change.rhs;
                                break;
                        }
                    }
                }

                function revertArrayChange(arr, index, change) {
                    if (change.path && change.path.length) {
                        // the structure of the object at the index has changed...
                        var it = arr[index],
                            i,
                            u = change.path.length - 1;
                        for (i = 0; i < u; i++) {
                            it = it[change.path[i]];
                        }
                        switch (change.kind) {
                            case 'A':
                                revertArrayChange(it[change.path[i]], change.index, change.item);
                                break;
                            case 'D':
                                it[change.path[i]] = change.lhs;
                                break;
                            case 'E':
                                it[change.path[i]] = change.lhs;
                                break;
                            case 'N':
                                delete it[change.path[i]];
                                break;
                        }
                    } else {
                        // the array item is different...
                        switch (change.kind) {
                            case 'A':
                                revertArrayChange(arr[index], change.index, change.item);
                                break;
                            case 'D':
                                arr[index] = change.lhs;
                                break;
                            case 'E':
                                arr[index] = change.lhs;
                                break;
                            case 'N':
                                arr = arrayRemove(arr, index);
                                break;
                        }
                    }
                    return arr;
                }

                function revertChange(target, source, change) {
                    if (target && source && change && change.kind) {
                        var it = target,
                            i,
                            u;
                        u = change.path.length - 1;
                        for (i = 0; i < u; i++) {
                            if (typeof it[change.path[i]] === 'undefined') {
                                it[change.path[i]] = {};
                            }
                            it = it[change.path[i]];
                        }
                        switch (change.kind) {
                            case 'A':
                                // Array was modified...
                                // it will be an array...
                                revertArrayChange(it[change.path[i]], change.index, change.item);
                                break;
                            case 'D':
                                // Item was deleted...
                                it[change.path[i]] = change.lhs;
                                break;
                            case 'E':
                                // Item was edited...
                                it[change.path[i]] = change.lhs;
                                break;
                            case 'N':
                                // Item is new...
                                delete it[change.path[i]];
                                break;
                        }
                    }
                }

                function applyDiff(target, source, filter) {
                    if (target && source) {
                        var onChange = function onChange(change) {
                            if (!filter || filter(target, source, change)) {
                                applyChange(target, source, change);
                            }
                        };
                        deepDiff(target, source, onChange);
                    }
                }

                Object.defineProperties(accumulateDiff, {

                    diff: {
                        value: accumulateDiff,
                        enumerable: true
                    },
                    observableDiff: {
                        value: deepDiff,
                        enumerable: true
                    },
                    applyDiff: {
                        value: applyDiff,
                        enumerable: true
                    },
                    applyChange: {
                        value: applyChange,
                        enumerable: true
                    },
                    revertChange: {
                        value: revertChange,
                        enumerable: true
                    },
                    isConflict: {
                        value: function value() {
                            return 'undefined' !== typeof conflict;
                        },
                        enumerable: true
                    },
                    noConflict: {
                        value: function value() {
                            if (conflictResolution) {
                                conflictResolution.forEach(function (it) {
                                    it();
                                });
                                conflictResolution = null;
                            }
                            return accumulateDiff;
                        },
                        enumerable: true
                    }
                });

                return accumulateDiff;
            });
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}], 5: [function (require, module, exports) {
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
    }, {}], 6: [function (require, module, exports) {
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
    }, {}], 7: [function (require, module, exports) {
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
    }, {}], 8: [function (require, module, exports) {
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
    }, { "_process": 7 }], 9: [function (require, module, exports) {
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
    }, { "./version": 10 }], 10: [function (require, module, exports) {
        module.exports = require('../package.json').version;
    }, { "../package.json": 11 }], 11: [function (require, module, exports) {
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
