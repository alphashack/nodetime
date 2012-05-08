var net = require("net"),
    msgpack = require("msgpack2");

var socket = null;
var pid = null;
connect();

function connect() {
    socket = null;
    pid = process.pid.toString();
    var conn = net.createConnection('/tmp/gd.agent.sock', function() {
        console.log("gd.agent.sync connected");
        socket = conn;
    });
    conn.on("error", function(err) {
        console.log("gd.agent.sync error: ", err);
        socket = null;
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

            //for(var i = 0; i < 100; i++){
            socket.write(new Buffer(bytes));
            //socket.write(msg, function() { console.log("gd.agent.sync data written")});
            socket.write(msg);
            //}
        }
    }
    catch(ex) {
        console.log("gd.agent.sync exception: ", ex);
        socket = null;
    }
}

exports.push = function(options, payload) {
    //var data = [];

    if(payload.samples) {
        payload.samples.forEach(function(sample) {
            if(sample.Type === 'HTTP') {
                var item = {
                    type:"Sample",
                    route:sample.Method + ":" + sample.URL + ":" + pid,
                    responsetime:sample._ms,
                    timestamp:sample._ts,
                    cputime:sample["CPU time (ms)"],
                    intimeoperations:sample["In-time operations"]
                };

                //console.log(JSON.stringify(sample));
                //console.log("--------\n", JSON.stringify(sample["In-time operations"]));
                //console.log("\n\n");

                write(item);
            }
        });
    }

    /*
    if(data.length > 0) {
        write(data);
        console.log("gdSync: data written");
    } else {
        console.log("gdSync: no samples");
    }
    */
}
