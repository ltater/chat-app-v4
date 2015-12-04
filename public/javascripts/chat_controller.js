<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
	<script src="/socket.io/socket.io.js"></script>
	<script>
		jQuery(function($) {
			var socket = io.connect();
			var $nickForm = $("#setNick");
			var $nickError = $("#nickError");
			var $nickBox = $("#nickname");
			var $users = $("#users");
			var $messageForm = $('#send-message');
			var $messageBox = $('#message');
			var $chat = $('#chat');

			$nickForm.submit(function(e) {
				e.preventDefault();
				socket.emit('new user', $nickBox.val(), function(data) {
					if(data) {
						$("#nickWrap").hide();
						$("#contentWrap").show();
					} else {
						$nickError.html('That username is already taken.');
					}
				});
				$nickBox.val('');
			});

			socket.on('usernames', function(data) {
				var html = '';
				for(var i=0; i < data.length; i++) {
					html += data[i] + '<br>'
				}
				$users.html(html);
			});

			$messageForm.submit(function(e) {
				e.preventDefault();
				socket.emit('send message', $messageBox.val(), function(data) {
					$chat.append("<span class='error'>" + "<b>" + data + "</span>" + "<br/>");
				});
				$messageBox.val('');
			});

			socket.on('load old msgs', function(documents){
				for(var i=documents.length-1; i >= 0; i--) {
					displayMsg(documents[i]);
				}
			});

			socket.on('new message', function(data) {
				displayMsg(data);
				$.ajax({
					// url: "http://api.nytimes.com/svc/topstories/v1/sports.json?api-key=NYT_API_KEY",
					data: {
						"section": "Sports"
					},
					method: "get",
					dataType: "json",
					success: function(data) {
						var apidata = data; // returns object object
						var newApiData = $(apidata).data({apidata}); //returns object array
						var apitext = $(newApiData).text(); //no error, but doesn't return anything (but, if .data() is used to attach data(idiot), then that works correctly)
						$("#results").html("<p>" + apitext + "</p>");
						// console.log(apidata);
						// var newData = $("response").text($(apidata).find('document').text());
						// $('#response').text($(msg).find('h1').text());
						console.log(data);
						console.log(newApiData);
						console.log(apitext);

						
					}
				})
			});

			// socket.on('new message', function(data) {
			// 	$chat.append("<span class='msg'>" + "<b>" + data.nick + ": </b>" + data.msg + "</span>" + "<br/>");
			// });

			function displayMsg(data){
				$chat.append("<span class='msg'>" + "<b>" + data.nick + ": </b>" + data.msg + "</span>" + "<br/>");
			};

			socket.on('whisper', function(data) {
				$chat.append("<span class='whisper'>" + "<b>" + data.nick + ": </b>" + data.msg + "</span>" + "<br/>");
			});
		});
	</script>
