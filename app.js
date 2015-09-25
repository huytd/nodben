;(function(){

    var spawn = require('child_process').spawn;
    var express = require('express')();
    var http = require('http');
    var io = require('socket.io');

    function Benchmark() {
        this.httpServer = http.Server(express);
        this.httpServer.listen(3030, function() { });

        express.get('/', function(req, res) {
            res.sendFile(__dirname + '/index.html');
        });

        express.get('/chart.js', function(req, res) {
            res.sendFile(__dirname + '/chart.js');
        });

        this.server = io(this.httpServer);
        this.server.on('connection', function(socket){
            socket.broadcast.emit('hi!');
        });
    }

    console.clearAll = function () {
        return process.stdout.write('\033c');
    }

    Benchmark.prototype.start = function(pid) {
        var self = this;
        var topp = spawn('top', ['-pid', pid, '-l', 0, '-stats', 'pid,cpu,th,time,mem']);
        topp.stdout.on('data', function(stream) {
            var lines = stream.toString().split('\n');

            var totalCPUline = lines[3];
            var cpu_user_pattern = /\d+.\d+% user/g;
            var user_pattern = / user/g;
            var cpu_sys_pattern = /\d+.\d+% sys/g;
            var sys_pattern = / sys/g;
            var cpu_idle_pattern = /\d+.\d+% idle/g;
            var idle_pattern = / idle/g;

            var diskUsageLine = lines[9];
            var disk_read_pattern = /\d+\/\d+[BKMGT] read/g;
            var disk_write_pattern = /\d+\/\d+[BKMGT] written/g;
            var read_pattern = / read/g;
            var write_pattern = / written/g;
            console.log(diskUsageLine.match(disk_write_pattern));
            var read_text = diskUsageLine.match(disk_read_pattern)[0].replace(read_pattern, '').split('/');
            var write_text = diskUsageLine.match(disk_write_pattern)[0].replace(write_pattern, '').split('/');

            var netUsageLine = lines[8];
            var net_in_pattern = /\d+\/\d+[BKMGT] in/g;
            var net_out_pattern = /\d+\/\d+[BKMGT] out/g;
            var in_pattern = / in/g;
            var out_pattern = / out/g;
            var net_in_text = netUsageLine.match(net_in_pattern)[0].replace(in_pattern, '').split('/');
            var net_out_text = netUsageLine.match(net_out_pattern)[0].replace(out_pattern, '').split('/');

            var processData = lines[lines.length -2].split(' ').filter(Boolean);
            var processInfo = {
                pid: processData[0],
                cpu: processData[1],
                threads: processData[2],
                time: processData[3],
                mem: processData[4]
            };

            var totalDisk = {
                read: read_text[0],
                read_size: read_text[1],
                write: write_text[0],
                write_size: write_text[1]
            };

            var totalNetworks = {
                in: net_in_text[0],
                in_size: net_in_text[1],
                out: net_out_text[0],
                out_size: net_out_text[1]
            };

            var totalCPU = {
                user: totalCPUline.match(cpu_user_pattern)[0].replace(user_pattern, ''),
                sys: totalCPUline.match(cpu_sys_pattern)[0].replace(sys_pattern, ''),
                idle: totalCPUline.match(cpu_idle_pattern)[0].replace(idle_pattern, '')
            };

            var result = {
                process: processInfo,
                computer: {
                    cpu: totalCPU,
                    disk: totalDisk,
                    networks: totalNetworks
                }
            };

            console.clearAll();

            if (self.server != undefined) {
                self.server.emit('benchmark', result);
            }

            console.log(stream.toString());
            console.log();
            console.log('Benchmark server is running on http://localhost:3030/');
        });
    }

    module.exports = Benchmark;
})();
