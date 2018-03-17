var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

nicknames = []; // 닉네임 저장 배열 선언

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	socket.on("new user", function(data, callback) {
      
	  
	  if (nicknames.indexOf(data) >= 0) {
         callback(false);
      } else {
         callback(true);
         socket.nickname = data;
         nicknames[socket.nickname] = socket;
         console.log(data+' 입장!!');
       socket.broadcast.emit("new user", data);
      }
   }); // 유저 접속 알림,
	
	socket.on("disconnect", function(data) {
      if (!socket.nickname)
         return;
      nicknames.splice(nicknames.indexOf(socket.nickname), 1);
     console.log(socket.nickname+' 퇴장!!');
     io.sockets.emit("disconnect", socket.nickname);
     
   });
  socket.on('chat message', function(msg){
<<<<<<< HEAD
     //�ڱ��ڽ��� ������ Ŭ���̾�Ʈ �鿡�� emit�� ������ �ٲپ���
    socket.broadcast.emit('chat message', msg);
=======
     //자기자신을 제외한 클라이언트 들에게 emit을 보내게 바꾸어줌
    socket.broadcast.emit('chat message', msg);
  });
  //typing emit이 올시에 브로드캐스트방식으로 typing emit 클라이언트에게 보내기
  socket.on('typing', function(msg){
	 socket.broadcast.emit('typing', msg);
>>>>>>> nickname
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});