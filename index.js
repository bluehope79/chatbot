var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
     //자기자신을 제외한 클라이언트 들에게 emit을 보내게 바꾸어줌
    socket.broadcast.emit('chat message', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});