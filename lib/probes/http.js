/*
 * Copyright (c) 2012 Dmitri Melikyan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var proxy = require('../proxy'),
    stats = require('../stats'),
    nt = require('../nodetime'),
    context = require('../context');

module.exports = function(obj) {
    // server probe
    proxy.before(obj.Server.prototype, ['on', 'addListener'], function(obj, args) {
        if(args[0] !== 'request') return;

        proxy.callback(args, -1, function(obj, args) {
            var req = args[0];
            var res = args[1];

            req.graphdat = {
                context: new context(
                    function() {
                        return {time: stats.time(true)};
                    },
                    function(data) {
                        data.measureOk = data.time.measure();
                    }
                ),
                begin: function(name) {
                    if(nt.gdSync.debug && nt.gdSync.debug.http_begin) nt.gdLog(nt.logType.Info, 'begin %s', name);
                    req.graphdat.context.enter(
                        name,
                        function() {
                            return {time: stats.time(true)};
                        },
                        function(data) {
                            data.measureOk = data.time.measure();
                        }
                    );
                },
                end: function(name) {
                    var data = req.graphdat.context.leave(name);
                    if(nt.gdSync.debug && nt.gdSync.debug.http_end) nt.gdLog(nt.logType.Info, 'end %s (%dms)', name, data.time.ms);
                },
	            trace: function(callback) {
		            if(nt.gdSync.debug && nt.gdSync.debug.http_trace) nt.gdLog(nt.logType.Info, 'trace in');
		            callback.graphdat = req.graphdat;
		            return callback;
	            },
	            endoncall: function(callback, name) {
		            var newCallback = function() {
			            req.graphdat.end(name);
			            callback.apply(this, arguments);
		            };
		            if(callback.graphdat)
		                newCallback.graphdat = callback.graphdat;
		            return newCallback;
	            }
            };

            proxy.after(res, 'end', function(obj, args) {
                var rootContext;
                if(!req.graphdat.context.validate()) {
                    if(!nt.gdSync.suppress || !nt.gdSync.suppress.context_pop_automatic) nt.gdLog(nt.logType.Warning, 'popping context automatically, you have not ended each context you created, this might be an error (you can suppress this warning: context_pop_automatic)');
                    rootContext = req.graphdat.context.exit();
                }
                else {
                    rootContext = req.graphdat.context.done();
                }
                var context = req.graphdat.context.flatten(
                    function(data) {
                        if(data.measureOk) {
                            return {
                                timestamp: data.time.timestamp,
                                responsetime:data.time.ms,
                                cputime: data.time.cpuTime
                            }
                        }
                        return {};
                    }
                );
                if(rootContext.measureOk) {
                    stats.value('HTTP Server', 'Requests per minute', 1, undefined, 'sum');
                    stats.value('HTTP Server', 'Average response time', rootContext.time.ms, 'ms', 'avg');

                    stats.sample(
                        rootContext.time,
                        {
                            'Type': 'HTTP',
                            'Method': req.method,
                            'URL': req.url,
                            'Request headers': req.headers,
                            'Status code': res.statusCode,
                            'Context': context
                        },
                        req.url
                    );
                }

            });
        });
    });

    // client error probe
    proxy.after(obj, 'request', function(obj, args, ret) {
        var time = undefined;
        var trace = stats.trace();
        var opts = args[0];

        proxy.before(ret, 'end', function(obj, args) {
            time = opts.__time__ = !opts.__time__ ? stats.time() : undefined;
        });

        proxy.before(ret, ['on', 'addListener'], function(obj, args) {
            if(args[0] !== 'error') return;

            proxy.callback(args, -1, function(obj, args) {
                if(!time || !time.measure()) return;

                var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;

                stats.value('HTTP Client', 'Requests per minute', 1, undefined, 'sum');
                stats.value('HTTP Client', 'Average response time', time.ms, 'ms', 'avg');

                var obj = {'Type': 'HTTP',
                    'Method': opts.method,
                    'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + (opts.path || '/'),
                    'Request headers': opts.headers,
                    'Stack trace': trace,
                    'Error': error};
                stats.sample(time, obj, 'HTTP Client: ' + obj.URL);
            });
        });
    });


    // client probe
    proxy.before(obj, 'request', function(obj, args) {
        var trace = stats.trace();
        var opts = args[0];

        proxy.callback(args, -1, function(obj, args) {
            var res = args[0];
            proxy.before(res, ['on', 'addListener'], function(obj, args) {
                if(args[0] !== 'end') return;

                proxy.callback(args, -1, function(obj, args) {
                    var time = opts.__time__;
                    if(!time || !time.measure()) return;

                    stats.value('HTTP Client', 'Requests per minute', 1, undefined, 'sum');
                    stats.value('HTTP Client', 'Average response time', time.ms, 'ms', 'avg');

                    var obj = {'Type': 'HTTP',
                        'Method': opts.method,
                        'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + (opts.path || '/'),
                        'Request headers': opts.headers,
                        'Response headers': res.headers,
                        'Status code': res.statusCode,
                        'Stack trace': trace};
                    stats.sample(time, obj, 'HTTP Client: ' + obj.URL);
                });
            });
        });
    });
};


