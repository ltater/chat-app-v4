var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
var users = {};

server.listen(3000);

//Mongoose Connection
mongoose.connect(process.env.MONGO_DB_CONN_CHATAPPS);

//Document Schema
var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});

//Create Collection
var Chat = mongoose.model('message', chatSchema);


app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket) {
	var query = Chat.find({});
	query.sort('-created').exec(function(err, documents) {
		if(err) throw err;
		socket.emit('load old msgs', documents);
	});

	socket.on('new user', function(data, callback) {
		if (data in users) {
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});

	function updateNicknames() {
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback) {
		var msg = data.trim();
		if(msg.substr(0,3) === '/w ') {
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1) {
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users) {
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('whisper!');
				} else {
					callback('Error, please enter a valid user.');
				}
			} else {
				callback('Error, please enter a message for your whisper.');
			}
			
		} else {
			//save messages to mongodb
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err) {
				if(err) throw err; 
				//send to everyone including the person who sent the message
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
				// send to everyone but the person who sent the message
				//socket.broadcast.emit('new message', data);
			});
		}
	});

	socket.on('disconnect', function(data) {
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	})
});