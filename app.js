var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
var request = require('request');
var users = {};

server.listen(3000);

//Mongoose Connection
mongoose.connect(process.env.MONGO_DB_CONN_CHATAPPS);

//Document Schema
var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	article: Object,
	created: {type: Date, default: Date.now}
});

//Create Collection
var Chat = mongoose.model('message', chatSchema);

//NYT API Key
var NYT_API_KEY = process.env.NYT_API_KEY;

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket) {
	var query = Chat.find({});
	query.sort('-created').limit(8).exec(function(err, documents) {
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
		var apiArticle = findArticle();
		console.log(apiArticle);

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
			var newMsg = new Chat({msg: msg, nick: socket.nickname, article: "apiArticle"});

			function findArticle() {
				var apiCall = "http://api.nytimes.com/svc/topstories/v1/sports.json?api-key=" + NYT_API_KEY;

				request(apiCall, function(err, resp, object) {
					var object = JSON.parse(object);
					var articles = object.results;
					var randomArticle = articles[Math.floor(Math.random()*articles.length)];
					console.log("random article inside the function");
					return randomArticle;

					// function findTitles(articles) {
					// 	var randomArticle = articles[Math.floor(Math.random()*articles.length)];
					// 	var randomArticleTitle = randomArticle.title;
					// 	var randomArticleURL = randomArticle.url;
					// 	console.log(randomArticleTitle);
					// 	console.log(randomArticleURL);
					// }
					// var apiArticle = findTitles(articles);
				});
			}
			
			newMsg.save(function(err) {
				if(err) throw err; 
				//send to everyone including the person who sent the message
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname, article: "apiArticle"});
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