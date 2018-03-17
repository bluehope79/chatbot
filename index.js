var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var Client = require('mongodb').MongoClient;


var userList = new Array();
var typingList  = new Array(); // 타이핑 중인사람 배열 선언

Client.connect('mongodb://localhost:27017/food', function(error, db){
    if(error) {
        console.log(error);
    } else {
        // 1. 입력할 document 생성
        var food = {name:'떡볶이', taste:'맵',type:'야채',money:'저'};
        // 2. breakfast 컬렉션의 insert( ) 함수에 입력 (여기서 컬렉션 구분가능, mysql의 table)
        db.collection('breakfast').insert(food);
		console.log('삽입');
        db.close();
    }
});	// 데이터베이스 삽입 제대로 작동하는지 테스트


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	var nickname;
   function updateNicknames() {   // 접속 중인 멤버체크를 위한 메소드 구현 중
      	io.sockets.emit('typing', { 
		typingList : typingList 
      ,userList : userList
    });
   }
   
  //핫솔이 new user 추가//
  socket.on("new user", function(data, callback) {
      if (userList.indexOf(data) != -1) {
         callback(false);
      } else {
         callback(true);
         socket.nickname = data;
		 nickname = data;
         userList.push(nickname);
         updateNicknames();
         console.log(data+' 입장!!');
		 socket.broadcast.emit("chat message", socket.nickname+'님이 입장하셨습니다.','비룡');
      }
   }); // 유저 접속 알림
   
   socket.on("disconnect", function(data) {
      if (!socket.nickname)
         return;
     var i = userList.indexOf(nickname);
	 var j = typingList.indexOf(nickname);
	console.log(userList[i]+' 퇴장!!');
	userList.splice(i,1);
	if(j != -1)
		typingList.splice(j,1);
	socket.broadcast.emit("chat message", socket.nickname+'님이 퇴장하셨습니다.','비룡');
    updateNicknames();
   });
   /////////////////////
   
  socket.on('chat message', function(msg){
     //자기자신을 제외한 클라이언트 들에게 emit을 보내게 바꾸어줌
	 var i = msg.indexOf('비룡');
	 if( i != -1)
	 {
		socket.broadcast.emit('chat message', msg, socket.nickname); 
		io.sockets.emit('chat message', '부르셨습니까 ?', '비룡'); 
	 }
	 else 
		socket.broadcast.emit('chat message', msg, socket.nickname);
	updateNicknames();
  });
  
  //typing emit이 올시에 브로드캐스트방식으로 typing emit 클라이언트에게 보내기
  socket.on('typing', function(msg){
	if(msg == true) {
		var i = typingList.indexOf(nickname);
		if(i == -1){
				typingList.push(nickname);
		}
	}
	else{
				var i = typingList.indexOf(nickname);
				typingList.splice(i,1);
	}
	updateNicknames();
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});