#!/usr/bin/env node


var pty = require('pty.js');
var socket_io = require('socket.io');
var http = require('http');
var fs = require('fs');
var path = require('path');
var tls = require('tls');


var hs = http.createServer(handler);
var io = require('socket.io').listen(hs);

var BUFFER_EMPTY = new Buffer(0);

var MSG_REQ_SESSION = 0xC000;
var MSG_NEW_SESSION = 0xC001;

var MSG_LOG_MESSAGE = 0xC010;

var MSG_PROC_DATA = 0xC100;
var MSG_PROC_EXIT = 0xC110;
var MSG_PROC_KILL = 0xC111;
var MSG_PROC_RESIZE = 0xC120;

var SERVER_KEY = fs.readFileSync(path.join(__dirname, 'server.key'));
var SERVER_CERT = fs.readFileSync(path.join(__dirname, 'server.crt'));


var PORT = 8091;
hs.listen(PORT, function() {
	console.log('listening on port ' + PORT);
});

function
handler(req, res) {
	console.log(req.method + ' ' + req.url);
	if (req.method === 'GET') {
		if (req.url === '/') {
			res.writeHead(200);
			res.end(fs.readFileSync(path.join(__dirname,
			    'static', 'whiteknight.html')));
		} else if (req.url === '/whiteknight.js') {
			res.writeHead(200);
			res.end(fs.readFileSync(path.join(__dirname,
			    'static', 'whiteknight.js')));
		} else {
			res.writeHead(404);
			res.end('NO FILE FOUND!');
		}
	} else {
		res.writeHead(500);
		res.end('YOU WHAT?');
	}
}


var CHSZ = 60;
var SOCKETS = [];

function send_status_line(S)
{
	var parties = io.sockets.clients(S.roomname);
	var ipaddrs = parties.map(function(party) {
		return (party.handshake.address.address);
	});
	var status_line = 'connected. parties: ' + ipaddrs.join(', ');
	io.sockets.in(S.roomname).emit('status_line', {
		status_line: status_line
	});
}

var SESSIONS = {};

var SESSION_NAME_CHARS = 'ABCDEFGHJKLPQRTUWXYZ2346789';
function new_session_name()
{
	var s = '';
	var chrcnt = 0;
	while (chrcnt < 16) {
		if (chrcnt !== 0 && chrcnt % 4 === 0)
			s += '-';
		var chrn = Math.floor(Math.random() *
		    SESSION_NAME_CHARS.length);
		s += SESSION_NAME_CHARS[chrn];
		chrcnt++;
	}
	return s;
}

function clean_session_name(session)
{
	var outs = '';
	if (!session)
		return (outs);
	for (var i = 0; i < session.length; i++) {
		if (SESSION_NAME_CHARS.indexOf(session[i]) !== -1)
			outs += session[i];
	}
	return (outs);
}

function
send_data(S, datafull)
{
	var bracketing = (datafull.length > CHSZ);

	if (bracketing)
		io.sockets.in(S.roomname).emit('disable_dom', {});

	io.sockets.in(S.roomname).emit('sync', { data: datafull });
	S.data += datafull;

	if (bracketing) {
		if (S.timeout)
			clearTimeout(S.timeout);
		S.timeout = setTimeout(function() {
			io.sockets.in(S.roomname).emit('enable_dom', {});
			S.timeout = null;
		}, 60);
	}
}

function
send_exit(S)
{
	var data0 = '\r\n\r\n ** Process exited.\r\n';

	io.sockets.in(S.roomname).emit('sync', { data: data0 });
	S.data += data0;
}

function
join_session(socket, session_name)
{
	/*
	 * Check for the existence of this session:
	 */
	session_name = clean_session_name(session_name);
	if (!SESSIONS.hasOwnProperty(session_name)) {
		socket.emit('sorry', {
			message: 'I\'m sorry, but that session does ' +
			    'not exist.  Please try again.'
		});
		return;
	}
	var S = SESSIONS[session_name];

	/*
	 * Send the backlog to the client:
	 */
	socket.emit('start_terminal', {});
	socket.emit('disable_dom', {});
	socket.emit('sync', {
		reset: true,
		cols: S.width,
		rows: S.height,
		data: S.data
	});
	socket.emit('enable_dom', {});

	/*
	 * Subscribe the client to the room:
	 */
	socket.on('disconnect', function() {
		socket.leave(S.roomname);
		if (S.shaft !== null) {
			var ipaddr = socket.handshake.address.address;
			var buf = new Buffer(ipaddr + ' has left');
			S.shaft.send(MSG_LOG_MESSAGE, buf);
		}
		send_status_line(S);
		if (S.shaft === null &&
		    io.sockets.clients(S.roomname).length === 0) {
			console.log(' * 2deleting ' + S.name);
			delete SESSIONS[S.cname];
		}
	});
	socket.on('keystroke', function(msg) {
		if (S.shaft !== null) {
			var buf = new Buffer(msg.str, 'utf8');
			S.shaft.send(MSG_PROC_DATA, buf);
		}
	});
	socket.join(S.roomname);
	send_status_line(S);

	/*
	 * Emit a log message on the shaft client console.
	 */
	if (S.shaft !== null) {
		var ipaddr = socket.handshake.address.address;
		var buf = new Buffer(ipaddr + ' has joined');
		S.shaft.send(MSG_LOG_MESSAGE, buf);
	}
}

io.sockets.on('connection', function(socket) {
	socket.on('register', function(msg) {
		join_session(socket, msg.session_name);
	});
});




var tls = require('tls');
var Shaft = require('shaft').Shaft;
var server_shaft = tls.createServer({
	key: SERVER_KEY,
	cert: SERVER_CERT,

	ca: [ SERVER_CERT ],
	honorCipherOrder: true
}, new_shaft);

function
new_shaft(conn)
{
	var S = null;
	conn.setNoDelay(true);
	var shaft = new Shaft(conn);

	console.log(' * shell client connected from ' + conn.remoteAddress);

	shaft.on('message', function(msgtype, msgbuf) {
		if (S === null) {
			/*
			 * OK, we want to start a session:
			 */
			if (msgtype === MSG_REQ_SESSION) {
				var sn = new_session_name();
				var csn = clean_session_name(sn);
				while (SESSIONS.hasOwnProperty(csn)) {
					sn = new_session_name();
					csn = clean_session_name(sn);
				}
				console.log(' * new session: ' + sn);
				SESSIONS[csn] = S = {
					name: sn,
					cname: csn,
					width: 80,
					height: 25,
					data: '',
					roomname: 'terminal:' + csn,
					shaft: shaft
				};
				// XXX send resize
				shaft.send(MSG_NEW_SESSION, new Buffer(sn,
				    'ascii'));
			} else {
				console.log(' * unknown message: ' +
				    msgtype);
				shaft.end();
			}
		} else {
			/*
			 * We're in a session, so route messages
			 * appropriately:
			 */
			if (msgtype === MSG_PROC_DATA) {
				var data0 = msgbuf.toString('utf8');
				send_data(S, data0);
			} else if (msgtype === MSG_PROC_EXIT) {
				shaft.end();
				send_exit(S);
			}
		}
	});
	shaft.once('end', function() {
		console.log(' * shell client end');
		if (S !== null) {
			S.shaft = null;
			if (io.sockets.clients(S.roomname).length === 0) {
				console.log(' * deleting ' + S.name);
				delete SESSIONS[S.cname];
			}
		}
	});
}

var SHAFT_PORT = 10502;
server_shaft.listen(SHAFT_PORT, function() {
	console.log(' * listening for shell clients on ' + SHAFT_PORT);
});


/* vim: set noet tw=76 ts=8 sw=8 sts=8: */
