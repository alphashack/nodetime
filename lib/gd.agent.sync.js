var net = require("net"),
    nt = require("./nodetime"),
    msgpack = require("./msgpack");

var socket = null;
var pid = null;
var lastWasError = false;
connect();

function connect() {
    if(!nt.gdSync) return;

    socket = null;
    pid = process.pid.toString();
    socketFile = nt.gdSync.socketFile ? nt.gdSync.socketFile : '/tmp/gd.agent.sock';
    var conn = net.createConnection(socketFile, function() {
        socket = conn;
        lastWasError = false;
        nt.gdLog(nt.logType.Info, "gd.agent.sync connected (%s)", socketFile);
    });
    conn.on("error", function(err) {
        socket = null;
        if(!lastWasError)
            nt.gdLog(nt.logType.Error, "gd.agent.sync (%s): ", socketFile, err);
        lastWasError = true;
    });
}

function write(item, retry) {
    try {
        if(!socket && !retry) {
            connect();
            setTimeout(function() { write(item, true); }, 0);
        }
        if(socket) {
            var msg = msgpack.encode(item);
            var length = msg.length;

            var bytes = new Array(4)
            bytes[0] = length >> 24
            bytes[1] = length >> 16
            bytes[2] = length >> 8
            bytes[3] = length

            socket.write(new Buffer(bytes));
            if(nt.gdSync.debug && nt.gdSync.debug.sync_write) {
                socket.write(msg, function() { nt.gdLog(nt.logType.Info, "gd.agent.sync sent to agent: %s", JSON.stringify(item))});
            }
            else {
                socket.write(msg);
            }
        }
    }
    catch(ex) {
        nt.gdLog(nt.logType.Error, "gd.agent.sync exception: ", ex);
        socket = null;
    }
}

exports.push = function(options, payload) {
    if(payload.samples) {
        payload.samples.forEach(function(sample) {
            if(sample.Type === 'HTTP') {
                var item = {
                    type: "Sample",
                    source: sample.Type,
                    route: sample.Method + " " + sample.URL,
                    responsetime: sample._ms,
                    timestamp: sample._ts,
                    cputime: sample["CPU time (ms)"],
                    pid: pid,
                    context: sample.Context
                    // remove heavy 'blob' data // intimeoperations:sample["In-time operations"]
                };

                write(item);
            }
        });
    }
}
