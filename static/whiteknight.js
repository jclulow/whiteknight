var MAX_SCROLLBACK = 500;
var BRS = [];
var SPANS = [];
var TEXTDATA = [];
var i = 0;

var WIDTH = 80;
var HEIGHT = 25;

var EMPTY_LINE = '';
while (EMPTY_LINE.length < WIDTH)
	EMPTY_LINE += ' ';

while (TEXTDATA.length < HEIGHT) {
	TEXTDATA.push(EMPTY_LINE);
}


var TOP_Y = 0;
var BTM_Y = TEXTDATA.length - 1;

var CURS_X = 0;
var CURS_Y = 0;

var UPDATE_DOM = true;

var STATUS_DIV = null;

var SESSION_NAME = null;

var termStyleBase = [
    'font: 20px Monospace',
    'margin: 1px'
].join('; ') + '; ';
var termStyle = termStyleBase + [
    'color: grey'
].join('; ') + '; ';
var termStyleAct = termStyleBase + [
    'border-right: 1px solid white',
    'border-left: 1px solid white'
].join('; ') + '; ';
var termStyleTop = termStyleAct + 'border-top: 1px solid white; ';
var termStyleBtm = termStyleAct + 'border-bottom: 1px solid white; ';
var cursStyle = [
    'background-color: green'
].join('; ');

function
escape_html(text)
{
	return (text.replace(/</g, '&lt;').replace(/>/g, '&gt;').
		replace(/ /g, '&nbsp;').replace(/\t/g, '&#09;'));
}

function
move_by(deltax, deltay)
{
	var old_y = CURS_Y;

	CURS_X += deltax;
	if (CURS_X < 0)
		CURS_X = 0;
	CURS_Y += deltay;
	if (CURS_Y < TOP_Y)
		CURS_Y = TOP_Y;
	else if (CURS_Y > BTM_Y)
		CURS_Y = BTM_Y;

	redraw_row(old_y);
	redraw_row(CURS_Y);
}

function
move_to(x, y)
{
	var old_y = CURS_Y;
	if (x !== null)
		CURS_X = x;
	if (y !== null)
		CURS_Y = TOP_Y + y;

	redraw_row(old_y);
	redraw_row(CURS_Y);
}

function
move_to_next_tab_stop()
{
	var curts = Math.floor(CURS_X / 8);
	var newx = (curts + 1) * 8;
	move_by(newx - CURS_X, 0);
}

function
erase_to_end_of_line()
{
	TEXTDATA[CURS_Y] = TEXTDATA[CURS_Y].substr(0, CURS_X);
	while (TEXTDATA[CURS_Y].length < WIDTH)
		TEXTDATA[CURS_Y] += ' ';
	redraw_row(CURS_Y);
}

function
erase_in_display(type)
{
	if (!type)
		type = 0;

	var old_update_dom = UPDATE_DOM;
	UPDATE_DOM = false;

	switch (type) {
		case 0:
			if (CURS_X == 0 && CURS_Y == TOP_Y) {
				preserving_erase();
			} else {
				for (var i = CURS_Y; i <= BTM_Y; i++)
					clear_row(i);
			}
			break;
		case 1:
			for (var i = TOP_Y; i <= CURS_Y; i++)
				clear_row(i);
			break;
		case 2:
			for (var i = TOP_Y; i <= BTM_Y; i++)
				clear_row(i);
			break;
	}

	if (old_update_dom) {
		UPDATE_DOM = true;
		resync_dom();
	}
}

function
preserving_erase()
{
	var old_update_dom = UPDATE_DOM;
	UPDATE_DOM = false;

	var old_y = CURS_Y - TOP_Y;
	var erase_rows = BTM_Y - CURS_Y;
	for (var i = 0; i < erase_rows; i++) {
		append_row();
	}
	move_to(CURS_X, old_y);

	if (old_update_dom) {
		UPDATE_DOM = true;
		resync_dom();
	}
}

function
clear_row(y)
{
	TEXTDATA[y] = EMPTY_LINE;
	redraw_row(y);
}

function
LF()
{
	if (BTM_Y == CURS_Y) {
		append_row();
	} else {
		move_by(0, 1);
	}
}

function
CR()
{
	CURS_X = 0;
	redraw_row(CURS_Y);
}

function
resync_dom()
{
	while (SPANS.length > TEXTDATA.length) {
		var top_br = BRS.shift();
		var top_span = SPANS.shift();
		top_span.parentElement.removeChild(top_span);
		top_br.parentElement.removeChild(top_br);
	}

	while (SPANS.length < TEXTDATA.length) {
		var span = document.createElement('span');
		var br = document.createElement('br');
		document.body.insertBefore(span, STATUS_DIV);
		document.body.insertBefore(br, STATUS_DIV);
		SPANS.push(span);
		BRS.push(br);
	}

	for (var i = 0; i < SPANS.length; i++) {
		redraw_row(i);
	}

	//SPANS[SPANS.length - 1].scrollIntoView(true);
	STATUS_DIV.scrollIntoView(true);
}

function
append_row(move_cursor)
{
	/*
	if (UPDATE_DOM) {
		var span = document.createElement('span');
		var br = document.createElement('br');
		document.body.insertBefore(span, STATUS_DIV);
		document.body.insertBefore(br, STATUS_DIV);
		SPANS.push(span);
		BRS.push(br);
	}

	var truncated = false;
	if (TEXTDATA.length >= MAX_SCROLLBACK) {
		TEXTDATA.shift();

		if (UPDATE_DOM) {
			var top_br = BRS.shift();
			var top_span = SPANS.shift();
			top_span.parentElement.removeChild(top_span);
			top_br.parentElement.removeChild(top_br);
		}

		truncated = true;
	}
       */

	var truncated = false;
	if (TEXTDATA.length >= MAX_SCROLLBACK) {
		TEXTDATA.shift();
		truncated = true;
	}
	var s = '';
	while (s.length < 80)
		s += ' ';
	TEXTDATA.push(s);

	if (!truncated) {
		TOP_Y++;
		BTM_Y++;
		/*
		redraw_row(CURS_Y++);
		redraw_row(CURS_Y);
		       */
		CURS_Y++
	} /*else {
		redraw_row(CURS_Y - 1);
	}*/

       /*

	redraw_row(SPANS.length - 1);
	for (var i = 0; i < SPANS.length; i++) {
		restyle_row(i);
	} */

       /*
	if (UPDATE_DOM)
		SPANS[SPANS.length - 1].scrollIntoView(true);
	       */

	if (UPDATE_DOM)
		resync_dom();
}

function
restyle_row(y)
{
	if (!UPDATE_DOM)
		return;

	SPANS[y].setAttribute('style',
	    y === TOP_Y ? termStyleTop :
	    y === BTM_Y ? termStyleBtm :
	    y >= TOP_Y  ? termStyleAct :
	                  termStyle);
}

function
redraw_row(y)
{
	if (!UPDATE_DOM)
		return;

	SPANS[y].innerHTML = prepare_row(TEXTDATA[y],
	    (y == CURS_Y ? CURS_X : -1));
	restyle_row(y);
}

function
insert_char_at(x, y, char, moveCursor)
{
	var nl = TEXTDATA[y];
	var text0 = nl.substr(0, x);
	var text1 = char;
	var text2 = nl.substr(x + 1, nl.length - x + 1);

	TEXTDATA[y] = text0 + text1 + text2;

	if (moveCursor)
		CURS_X++;
	redraw_row(y);
	if (CURS_X >= 80) {
		CR();
		LF();
	}
}

function
prepare_row(text, curs)
{
	var text0, text1, text2;
	if (curs >= 0 && curs < text.length) {
		text0 = text.substr(0, curs);
		text1 = text.substr(curs, 1);
		text2 = text.substr(curs + 1);

		return (escape_html(text0) + '<span id="curs" style="' +
		    cursStyle + '">' + escape_html(text1) + '</span>' +
		    escape_html(text2));
	} else {
		return (escape_html(text));
	}
}

var bell_timeout = null;

function
body_black()
{
	document.body.setAttribute('style', 'background: black; ' +
	    'color: white;');
	bell_timeout = null;
}

function
body_white()
{
	document.body.setAttribute('style', 'background: white; ' +
	    'color: grey;');
}

function
visible_bell()
{
	if (bell_timeout !== null) {
		clearTimeout(bell_timeout);
		setTimeout(body_black, 25);
	} else {
		body_white();
		setTimeout(body_black, 25);
	}
}

var status_line = '';
function
write_status(line)
{
	status_line = line;
	STATUS_DIV.innerHTML = status_line;
}

var socket = null;
function
terminal_main()
{
	document.body.setAttribute('style', 'background: black; ' +
	    'color: white;');

	STATUS_DIV = document.createElement('div');
	document.body.appendChild(STATUS_DIV);
	write_status('loaded.');
	STATUS_DIV.setAttribute('style', termStyle);

	resync_dom();

	socket.on('sync', function(msg) {
		if (msg.reset) {
			CURS_X = 0;
			CURS_Y = TOP_Y;
			for (var i = 0; i < TEXTDATA.length; i++) {
				clear_row(i);
			}
		}
		ingest_data(msg.data);
	});
	socket.on('sorry', function() {
		window.location.reload();
	});
	socket.on('disable_dom', function() {
		UPDATE_DOM = false;
	});
	socket.on('enable_dom', function() {
		UPDATE_DOM = true;
		resync_dom();
	});
	socket.on('status_line', function(msg) {
		write_status(msg.status_line);
	});
	socket.on('connecting', function() {
		write_status('connecting...');
	});
	socket.on('connect', function() {
		write_status('connected!');
	});
	socket.on('reconnect', function() {
		socket.emit('register', {
			session_name: SESSION_NAME
		});
	});
	socket.on('disconnect', function() {
		write_status('disconnected.');
	});
	socket.on('connect_failed', function() {
		write_status('connection failed, giving up.');
	});

	document.addEventListener('keydown', keydown_listener);
	document.addEventListener('keypress', keypress_listener);
	document.addEventListener('keyup', eater);
}

function
main()
{
	var topdiv = document.createElement('div');
	document.body.appendChild(topdiv);

	document.body.setAttribute('style', 'font: 20px Monospace;' +
	    ' text-align: center; ');

	var elem;
	elem = document.createElement('h1');
	elem.innerHTML = 'Welcome to White Knight!';
	topdiv.appendChild(elem);
	topdiv.appendChild(document.createElement('br'));

	elem = document.createElement('div');
	elem.innerHTML = 'Please Enter Your Session Key:';
	topdiv.appendChild(elem);
	topdiv.appendChild(document.createElement('br'));

	var textinput = document.createElement('input');
	textinput.setAttribute('style', 'font: 40px Monospace;');
	topdiv.appendChild(textinput);
	topdiv.appendChild(document.createElement('br'));

	var errormsg = document.createElement('div');
	topdiv.appendChild(errormsg);
	topdiv.appendChild(document.createElement('br'));

	socket = io.connect('', {
		resource: 'wk-socket-io'
	});
	socket.on('sorry', function (msg) {
		SESSION_NAME = null;
		errormsg.innerHTML = msg.message;
		textinput.value = '';
		textinput.focus();
	});
	socket.once('start_terminal', function() {
		topdiv.parentElement.removeChild(topdiv);
		elem = textinput = topdiv = null;
		terminal_main();
	});

	textinput.addEventListener('keypress', function(x) {
		if (x.keyCode === 13) {
			SESSION_NAME = textinput.value.
			    toUpperCase().trim();
			socket.emit('register', {
				session_name: SESSION_NAME
			});
		}
	});
	textinput.focus();
}

function
eater()
{
	if (typeof (event.preventDefault) === 'function')
		event.preventDefault();
	if (typeof (event.stopPropagation) === 'function')
		event.stopPropagation();

	return (false);
}

var CURSOR_DRAW = true;
setInterval(function() {
	var curs = document.getElementById('curs');
	//var curs = $('#curs');
	CURSOR_DRAW = !!!CURSOR_DRAW;
	if (curs) {
		curs.setAttribute('style', CURSOR_DRAW ? cursStyle : '');
	}
}, 350);



var CC_A = 'A'.charCodeAt(0);
var CC_Z = 'Z'.charCodeAt(0);
var CC_a = 'a'.charCodeAt(0);
var CC_z = 'z'.charCodeAt(0);
var CC_0 = '0'.charCodeAt(0);
var CC_9 = '9'.charCodeAt(0);
var OTHER_PRINTING = '!@#$%^&*()_+-={}|[]\\;:\'",<.>/?`~';

function
keypress_listener(event)
{
	console.log('keypress: ' + event.keyCode);
	if (typeof (event.preventDefault) === 'function')
		event.preventDefault();
	if (typeof (event.stopPropagation) === 'function')
		event.stopPropagation();

	var cc = event.keyCode;
	var c = String.fromCharCode(cc);
	if (cc >= 1 && cc <= 31) {
		socket.emit('keystroke', { str: c });
	} else if (cc >= CC_A && cc <= CC_Z) {
		socket.emit('keystroke', { str: c });
	} else if (cc >= CC_a && cc <= CC_z) {
		socket.emit('keystroke', { str: c });
	} else if (cc >= CC_0 && cc <= CC_9) {
		socket.emit('keystroke', { str: c });
	} else if (OTHER_PRINTING.indexOf(c) !== -1) {
		socket.emit('keystroke', { str: c });
	}

	return (false);
}

function
keydown_listener(event)
{
	console.log('keydown: ' + event.keyCode);

	var cc = event.keyCode;
	switch (cc) {
		case 8: // backspace
			socket.emit('keystroke', { str: '\b' });
			break;
		case 9: // tab
			socket.emit('keystroke', { str: '\t' });
			break;
		case 13: // enter
			socket.emit('keystroke', { str: '\r' });
			break;
		case 27: // escape
			socket.emit('keystroke', { str: '\u001b' });
			break;
		case 32: // space
			socket.emit('keystroke', { str: ' ' });
			break;
		case 37: // left arrow
			socket.emit('keystroke', { str: '\u001b[D' });
			break;
		case 38: // up arrow
			socket.emit('keystroke', { str: '\u001b[A' });
			break;
		case 39: // right arrow
			socket.emit('keystroke', { str: '\u001b[C' });
			break;
		case 40: // down arrow
			socket.emit('keystroke', { str: '\u001b[B' });
			break;
		default:
			return (true);
	}
	console.log('SUPRESS');
	if (typeof (event.preventDefault) === 'function')
		event.preventDefault();
	if (typeof (event.stopPropagation) === 'function')
		event.stopPropagation();

	return (false);
}

var ESC = false;
var CSI = false;
var CSEQSTR = '';
var QMARK = false;
function
ingest_data(data)
{
	for (var i = 0; i < data.length; i++) {
		var c = data[i];
		var cc = data.charCodeAt(i);
		if (ESC) {
			ESC = false;
			if (c === '[') {
				CSI = true;
				CSEQSTR = '';
				QMARK = false;
				continue;
			}
		} else if (CSI) {
			if (c === '?') {
				QMARK = true;
				continue;
			} else if ((c >= '0' && c <= '9') || c === ';') {
				CSEQSTR += c;
				continue;
			} else if (c === 'H') {
				if (CSEQSTR) {
					var terms = CSEQSTR.split(/;/);
					terms = terms.map(function(x){
						return Number(x);
					});
					if (terms.length == 1)
						terms[1] = 1;
					move_to(terms[1] - 1, terms[0] - 1);
				} else {
					move_to(0, 0);
				}
			} else if (c === 'G') {
				var col = 1;
				if (CSEQSTR)
					col = Number(CSEQSTR);
				// move to column
				move_to(col - 1, null);
			} else if (c === 'J') {
				// erase to end of screen
				var n = 0;
				if (CSEQSTR)
					n = Number(CSEQSTR);
				erase_in_display(n);
				//erase_to_end_of_screen();
			} else if (c === 'K') {
				if (CSEQSTR)
					console.log('XXX K ' + CSEQSTR);
				else
					erase_to_end_of_line();
			} else if (c === 'm') {
				// XXX attributes
			} else if (c >= 'A' && c <= 'D') {
				var n = 1;
				if (CSEQSTR)
					n = Number(CSEQSTR);
				if (c === 'A')
					move_by(0, -n);
				else if (c === 'B')
					move_by(0, n);
				else if (c === 'C')
					move_by(n, 0);
				else if (c === 'D')
					move_by(-n, 0);
			} else {
				console.log('UNKNOWN CS: ' +
				    (QMARK ? '?' : '') + CSEQSTR + c);
			}
			CSI = false;
			continue;
		}

		if (c === '\n') {
			LF();
		} else if (c === '\r') {
			CR();
		} else if (c === '\u001b') {
			ESC = true;
		} else if (c === '\b') {
			move_by(-1, 0);
		} else if (c === '\u0007') {
			visible_bell();
		} else if (c === '\t') {
			move_to_next_tab_stop();
		} else if (cc < 32) {
			// nothing
		} else {
			insert_char_at(CURS_X, CURS_Y, c, true);
		}
	}
}


/* vim: set noet ts=8 sw=8 sts=8: */
