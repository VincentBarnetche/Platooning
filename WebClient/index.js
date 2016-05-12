var socket = io();
var userId = "user";

$("#led-link").on('click', function(e){
    socket.emit('toogle led', {value: 0, userId: userId});
});

socket.on('found_device', function(msg) {
    var container = $("#led-container");
    container.removeClass('off');
    container.addClass('on');
});
          
socket.on('lost_device', function(msg) {
    var container = $("#led-container");
    container.removeClass('on');
    container.addClass('off');
});

window.onunload = function(e) {
    socket.emit("user disconnect", userId);
}