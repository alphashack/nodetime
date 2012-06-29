var net = require("net"),
    msgpack = require("msgpack2"),
    nt = require("./nodetime");

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
        console.log("gd.agent.sync connected (%s)", socketFile);
    });
    conn.on("error", function(err) {
        socket = null;
        if(!lastWasError)
            console.error("gd.agent.sync (%s) error: ", socketFile, err);
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
            var msg = msgpack.pack(item);
            var length = msg.length;

            var bytes = new Array(4)
            bytes[0] = length >> 24
            bytes[1] = length >> 16
            bytes[2] = length >> 8
            bytes[3] = length

            socket.write(new Buffer(bytes));
            //socket.write(msg, function() { console.log("gd.agent.sync data written")});
            socket.write(msg);
        }
    }
    catch(ex) {
        console.error("gd.agent.sync exception: ", ex);
        socket = null;
    }
}

exports.push = function(options, payload) {
    if(payload.samples) {
        payload.samples.forEach(function(sample) {
            if(sample.Type === 'HTTP') {
                var item = {
                    type:"Sample",
                    route:sample.Method + ":" + sample.URL + ":" + pid,
                    responsetime:sample._ms,
                    timestamp:sample._ts,
                    cputime:sample["CPU time (ms)"]
                    // remove heavy 'blob' data // intimeoperations:sample["In-time operations"]
                };

                //console.log(JSON.stringify(sample));
                //console.log("--------\n", JSON.stringify(sample["In-time operations"]));
                //console.log("\n\n");

                write(item);
            }
        });
    }
}
