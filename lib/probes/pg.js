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


var proxy = require('../proxy');
var stats = require('../stats');


module.exports = function(obj) {
  // Native, reinitialize probe 
  proxy.getter(obj, 'native', function(obj, ret) {
    proxy.after(ret, 'Client', function(obj, args, ret) {
      probe(ret.__proto__);
    });
  });

  probe(obj.Client.prototype);
};


var probe = function(obj) {
  if(obj.__probeInstalled__) return;
  obj.__probeInstalled__ = true;

  // Callback API
  proxy.before(obj, 'query', function(obj, args, ret) {
    var client = obj;
    var trace = stats.trace();
    var command = args.length > 0 ? args[0] : undefined;
    var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
    var time = stats.time();

    proxy.callback(args, -1, function(obj, args) {
      if(!time.measure()) return;

      var error = args.length > 0 && args[0] ? args[0].message : undefined;

      stats.value('PostgreSQL', 'Requests per minute', 1, undefined, 'sum');
      stats.value('PostgreSQL', 'Average response time', time.ms, 'ms', 'avg');

      var obj = {'Type': 'PostgreSQL',
          'Connection': {host: client.host, port: client.port, user: client.user, database: client.database ? client.database : undefined}, 
          'Command': stats.truncate(command), 
          'Params': stats.truncate(params),
          'Stack trace': trace,
          'Error': error};

      stats.sample(time, obj, 'PostgreSQL: ' + obj['Command']);
    });
  });


  // Evented API
  proxy.after(obj, 'query', function(obj, args, ret) {
    // If has a callback, ignore
    if(args.length > 0 && typeof args[args.length - 1] === 'function') return;

    var client = obj;
    var trace = stats.trace();
    var command = args.length > 0 ? args[0] : undefined;
    var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
    var time = stats.time();

    proxy.before(ret, 'on', function(obj, args) {
      var event = args[0];
      if(event !== 'end' && event !== 'error') return;

      proxy.callback(args, -1, function(obj, args) {
        if(!time.measure()) return;

        var error = (event === 'error' && args.length > 0) ? args[0].message : undefined;

        stats.value('PostgreSQL', 'Requests per minute', 1, undefined, 'sum');
        stats.value('PostgreSQL', 'Average response time', time.ms, 'ms', 'avg');

        var obj = {'Type': 'PostgreSQL',
            'Connection': {host: client.host, port: client.port, user: client.user, database: client.database ? client.database : undefined}, 
            'Command': stats.truncate(command), 
            'Params': stats.truncate(params),
            'Stack trace': trace,
            'Error': error};

        stats.sample(time, obj, 'PostgreSQL: ' + obj['Command']);
      });
    });
  });


};
