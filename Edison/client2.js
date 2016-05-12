var socket = require('socket.io-client')('http://localhost:8001');

var userId = 2;
var userUuid = 88888;

socket.on('connect', function(){
	console.log('connected');
	socket.emit('carInfo',{ID:userId,UUID:userUuid});
});
socket.on('event', function(data){});
socket.on('disconnect', function(){
	socket.emit('carDisconnect',{ID:userId});
});

socket.on('test1back',function(msg){
	console.log(msg.test);
})


setInterval(function(){
	socket.emit('test1',{user: userId});
},2000);