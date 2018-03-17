var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var Client = require('mongodb').MongoClient;
var db;

var docList = new Array();
var userList = new Array();
var typingList  = new Array(); // 타이핑 중인사람 배열 선언
var advice=0;   // flag : 1 메뉴 추천    flag : 2 재류 추천
var sebu = 0;
var sebulist=0;



Client.connect('mongodb://localhost:27017/Biryong', function(error, database){
    if(error) {
        console.log(error);
    } else {
        // 1. 입력할 document 생성
      db=database;
    }
});   // 데이터베이스 삽입 제대로 작동하는지 테스트


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
   var dbpass;
   var admin=0; //접근 했다고 알림 초기값 0
    var master=0; // 패스워드 확인했다고 알림 초기값 0
   var nickname;
   var master_input=0; // 삽입 권한 획득
   var master_del=0; // 삭제 권한 획득
   var master_revise=0; // 수정 권한 획득
   var time;

   
   var query = {name:'pass'};
        // 2. 읽어올 Field 선택
   var projection = {passward:1};
        // 3. find() 함수에 작성된 query와 projection을 입력
   var cursor = db.collection('passward').find(query,projection);
   cursor.each(function(err,doc){
      if(err){
         console.log(err);
      }else{
         if(doc != null){
            dbpass=doc.passward;
         }
      }
   }); // 비밀번호 db에서 받아오기
   
   function updateNicknames() {   // 접속 중인 멤버체크를 위한 메소드 구현 중
         io.sockets.emit('typing', { 
      typingList : typingList 
      ,userList : userList
    });
   }
    
	//<-- 시간 판단-->//
	function timere() {   // 접속 중인 멤버체크를 위한 메소드 구현 중
		var d = new Date();
		var n = d.getHours(); 
		if(n>=6&&n<=9){
			time=1;
		}
		else if(n<=14){
			time=2;
		}
		else if(n<=20){
			time=3;
		}
		else{
			time=4;
		}
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
    var j = msg.indexOf('메뉴추천');
    var k = msg.indexOf('세부추천');
    var l = msg.indexOf('관리자모드');
	var h = msg.indexOf('됐어');
    if( i != -1 && admin == 0 && master == 0){
       if(j!=-1 && advice == 0){    
         socket.broadcast.emit('chat message', msg, socket.nickname);
         io.sockets.emit('chat message', '메뉴추천/', '비룡');
		 advice = 1;
       }
       else if(k!=-1 && advice == 0){    
         socket.broadcast.emit('chat message', msg, socket.nickname);
         io.sockets.emit('chat message', '음식의 종류(한식:1,중식:2,일식:3,양식:4,디저트:5), 가격의 상한선을 입력해주세요.(/로 구분)', '비룡');
         advice=2;
       }
       else if(l!=-1){    
         socket.emit('chat message','관리자 비밀 번호를 입력하세요', '비룡');//자신에게만 보낼때
         admin = 1;
       }
	   else if(h != -1){
		       socket.broadcast.emit('chat message', msg, socket.nickname);
		 if(advice == 0){
			io.sockets.emit('chat message','선택하신 추천이 없습니다. 위 메뉴중 하나를 선택해주세요.', '비룡');//자신에게만 보낼때
		 }
		 else{
			advice = 0;	
			sebu = 0;
			sebulist = 0;
			io.sockets.emit('chat message','추천을 종료합니다.', '비룡');//자신에게만 보낼때			 
		 } 

	   }
       else{
         socket.broadcast.emit('chat message', msg, socket.nickname); 
         io.sockets.emit('chat message', '안녕하세요? 메뉴 추천 받으시려면 "비룡아 메뉴추천", 가지고 음식의 종류, 가격대로 추천 받으시려면 "비룡아 세부추천", 관리자이시면 "비룡아 관리자모드" 를 입력해주세요!', '비룡');
       }
	 
    }
	else if(admin == 1){
      if(msg==dbpass){  
         master = 1;
            socket.emit('chat message','관리자님 안녕하세요. "삽입", "삭제", "수정" 중 원하시는 기능을 입력하세요.(관리자 모드 종료는 관리자종료라고 말씀해주세요)', '비룡');
        }
      else{
         socket.emit('chat message','비밀번호 불일치하였습니다. 관리자모드를 종료 합니다.', '비룡');
      }
      admin=0;
    }
    else if(master == 1){//삽입,삭제,수정
       var input = msg.indexOf('삽입');
        var del = msg.indexOf('삭제');
      var revise = msg.indexOf('수정');
	  var stoping = msg.indexOf('관리자종료');
	  
	  if(stoping != -1){
		  master = 0;
		  socket.emit('chat message','관리자모드를 종료합니다.','비룡');
	  }
      else if(input!=-1){    //삽입
         socket.emit('chat message', '이름, 종류(한식:1,중식:2,일식:3,양식:4,디저트:5), 시간(아침:1,점심:2,저녁:3,야식:4), 재료, 가격, 레시피 순으로 넣어주세요.(/로 구분)', '비룡');
         master_input=1;
		 
      }
      else if(del!=-1){    
         socket.emit('chat message', '삭제할 요리의 이름을 입력하세요!', '비룡');
         master_del=1;
      }
      else if(revise!=-1){    
         socket.emit('chat message','수정할 요리의 이름과 바꾸고자 하는 이름, 종류(한식:1,중식:2,일식:3,양식:4,디저트:5), 시간(아침:1,점심:2,저녁:3,야식:4), 재료, 가격, 레시피 순으로 넣어주세요.(/로 구분)', '비룡');//자신에게만 보낼때
         master_revise=1;
      }
      else if(master_input == 1){
			var strarray=msg.split('/');
			var input={name:strarray[0],type:parseInt(strarray[1]),time:parseInt(strarray[2]),ingredients:strarray[3],money:parseInt(strarray[4]),recipe:strarray[5]};
			db.collection('foods').insert(input);
			socket.emit('chat message',strarray[0]+'을(를) 레시피에 입력하였습니다.:', '비룡');	
			socket.emit('chat message','"삽입", "삭제", "수정" 중 원하시는 기능을 입력하세요.(관리자 모드 종료는 관리자종료라고 말씀해주세요)', '비룡');
			master_input=0;
      }
      else if(master_del == 1){ // 삭제
         var query = {name:msg};
		 var cursor = db.collection('foods').find(query);
         db.collection('foods').remove(query);
		 socket.emit('chat message',msg+'을(를) 삭제하였습니다.:', '비룡');	
		socket.emit('chat message','"삽입", "삭제", "수정" 중 원하시는 기능을 입력하세요.(관리자 모드 종료는 관리자종료라고 말씀해주세요)', '비룡');
         master_del=0;
      }
      else if(master_revise == 1){
         var strarray=msg.split('/');
         // 수정
         var query = {name:strarray[0]};
         // 데이터 수정 명령 : set 명령을 사용하면 특정 field의 값만 변경할 수 있음
         var operator = {name:strarray[1],type:parseInt(strarray[2]),time:parseInt(strarray[3]),ingredients:strarray[4],money:parseInt(strarray[5]),recipe:strarray[6]};
         // 수정 옵션 : upsert 가 true 일 경우 query 대상이 존재하면 update, 없으면 insert 처리
         var options = {upsert:true};
         db.collection('foods').update(query,operator,options)
		 socket.emit('chat message',strarray[0]+'을(를) 수정하였습니다.:', '비룡');	
		 socket.emit('chat message','"삽입", "삭제", "수정" 중 원하시는 기능을 입력하세요.(관리자 모드 종료는 관리자종료라고 말씀해주세요)', '비룡');
         master_revise=0;
      }
	  else if(input == -1 && del == -1 && revise == -1){
		 socket.emit('chat message','잘못 선택하셨습니다.','비룡');
	  }
    }
    else if(advice==1){
		socket.broadcast.emit('chat message', msg, socket.nickname);
       //////////////////////////////
	   
	   
	   
	   
	   
	   
	   
	   
	   
	   //////////////////////////////////
    }
	 else if(advice==2){
		socket.broadcast.emit('chat message', msg, socket.nickname);
		if(sebu == 0){
			var strarray=msg.split('/');
			var query = {type:parseInt(strarray[0]), money:{'$lt':parseInt(strarray[1])} };
			var cursor = db.collection('foods').find(query);
			cursor.each(function(err,doc){
				if(err){
						console.log(err);
				}
				else{
					if(doc != null){
						var foodk = doc.name + '/'+doc.money+'/'+doc.ingredients+'/'+doc.recipe;
						var p = docList.indexOf(foodk);
						if( p == -1)
							docList.push(foodk);  
					}
				}
			});
			io.sockets.emit('chat message', '리스트를 불러왔습니다. 보실려면 "다음", 필요없으시면 "비룡아 됐어"라고 말씀해주세요.', '비룡');
			sebu = 1;
		}
		else{
			var p = msg.indexOf('다음');
			if(p != -1){
				if(sebulist<docList.length ){
					var strarray=docList[sebulist].split('/');
					io.sockets.emit('food recipe',{ strarray : strarray});
					//io.sockets.emit('chat message','이름: '+strarray[0]+'\n 가격: '+strarray[1]+', 재료: '+strarray[2]+', 레시피: '+strarray[3], '비룡'); 
					sebulist++;
				}
				else{
					sebu = 0;
					sebulist = 0;
					docList= new Array();
					io.sockets.emit('chat message','조건에 만족하는 음식을 다 보셨습니다. 다른 조건을 입력하시거나, 그만 보시려면 "비룡아 됐어"라고 말씀해 주세요', '비룡'); 
				}
			}
			else{
				io.sockets.emit('chat message', '뭐라고 하시는지 모르겠습니다.', '비룡');
			}
		}  
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
		if(i != -1)
        typingList.splice(i,1);

   }
   updateNicknames();
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});