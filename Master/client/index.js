var socket = io();
var userId = "user";
//Tableau qui contient les voitures connectées
var carsConnected = [];
// Etats du système
var etatConnV1 = 0;
var etatConnV2 = 0;
var platooningState = 0;
$("#led-link").on('click', function(e){
    socket.emit('toogle led', {value: 0, userId: userId});
});
setInterval(function(){
	socket.emit('requestInfo');
},2000);
socket.on('infoToWeb',function(msg){
	console.log('hei hei');
	var update = 0;
	if (etatConnV1 == msg.car1) {update=1;}
	if (etatConnV2 == msg.car2) {update=1;}
	if (platooningState == msg.plat) {update=1;}
	if (carsConnected == msg.connectedCars) {update=1;}
	if (update=1){updateDOM();};
	etatConnV2 = msg.car2;
	etatConnV1 = msg.car1;
	platooningState = msg.plat;
	carsConnected = msg.connectedCars;
});
var updateDOM = function(){
	var container1 = $("#car1container");
	var container2 = $("#car2container");
	carsConnected.forEach(function(e){
		if(e.ID == 1) {
			var uuid = container1.find("#carUUID");
			uuid.text(e.UUID);
		} else {
			var uuid = container2.find("#carUUID");
			uuid.text(e.UUID);
		}
	});
	var led = container1.find("#led-container");
	if (etatConnV1 == 1) {
		led.removeClass('off');
    	led.addClass('on');
	} else {
		led.removeClass('on');
    	led.addClass('off');	
	}
	var led = container2.find("#led-container");
	if (etatConnV2 == 1) {
		led.removeClass('off');
    	led.addClass('on');
	} else {
		led.removeClass('on');
    	led.addClass('off');	
	}
};
socket.on('foundDeviceToClient', function(msg) {
    if (msg.ID == 1) {
		var container = $("#car1container");
	} else {var container = $("#car2container");}
    var led = container.find("#led-container-beacon");
    led.removeClass('off');
    led.addClass('on');
    console.log('found device')
});
          
socket.on('lostDeviceToClient', function(msg) {
    if (msg.ID == 1) {
		var container = $("#car1container");
	} else {var container = $("#car2container");}
    var led = container.find("#led-container-beacon");
    led.removeClass('on');
    led.addClass('off');
});
socket.on('carInfoToClient',function(msg){
	if (msg.ID == 1) {
		var container = $("#car1container");
	} else {var container = $("#car2container");}
	var id = container.find("#carID");
	id.text(msg.ID);
	var uuid = container.find("#carUUID");
	uuid.text(msg.UUID);
	var button = container.find("#connectionStatus");
	button.removeClass("disconnected");
	button.addClass("connected");
	var led = container.find("#led-container");
    led.removeClass('off');
    led.addClass('on');
})
socket.on('carDisconnect',function(msg){
	if (msg.ID == 1) {
		var container = $("#car1container");
	} else {var container = $("#car2container");}
	var id = container.find("#carID");
	id.text('');
	var uuid = container.find("#carUUID");
	uuid.text('');
	var button = container.find("#connectionStatus");
	button.removeClass("connected");
	button.addClass("disconnected");
	var led = container.find("#led-container");
    led.removeClass('on');
    led.addClass('off');
})
window.onunload = function(e) {
    socket.emit("user disconnect", userId);
}
// ---------------- Pour commandes voiture ------------------
$('#acc-slider').slider().on('slide',function(val) {
	dutyCycle = val.value;
	socket.emit('updateDuty',dutyCycle);
});
var boutonTourneGauche = $('#bouton-tourne-gauche');
var boutonTourneDroite = $('#bouton-tourne-droite');
boutonTourneGauche.on('touchstart',function(){
		socket.emit('tourneGauche');
});
boutonTourneGauche.on('touchend',function(){
	socket.emit('arreteTourner');
});
boutonTourneDroite.on('touchstart',function(){
	socket.emit('tourneDroite');
});
boutonTourneDroite.on('touchend',function(){
	socket.emit('arreteTourner');
});
var boutonChangeDir = $('#bouton-change-dir');
var direction = 1;
boutonChangeDir.on('click', function() {
	socket.emit('changeDir');
	var spanBouton = boutonChangeDir.find('span');
	console.log('salut')
	if(direction==1) {
		console.log('activate arriere');
		direction=0;
		spanBouton.removeClass('glyphicon-arrow-up');
		spanBouton.addClass('glyphicon-arrow-down');
	} else {
		console.log('activate avant');
		direction=1;
		spanBouton.removeClass('glyphicon-arrow-down');
		spanBouton.addClass('glyphicon-arrow-up');
	}
});
​
var boutonVoiture1 = $("#bouton-voiture-1");
var boutonVoiture2 = $("#bouton-voiture-2");
setInterval(function() {
	var spanV1 = boutonVoiture1.find('span');
	if (etatConnV1 == 1) {
		spanV1.removeClass('label-danger');
		spanV2.addClass('label-success');
	} else {
		spanV1.removeClass('label-success');
		spanV1.addClass('label-danger')
	}
	var spanV2 = boutonVoiture2.find('span');
	if (etatConnV2 == 1) {
		spanV2.removeClass('label-danger');
		spanV2.addClass('label-success');
	} else {
		spanV2.removeClass('label-success');
		spanV2.addClass('label-danger');
	}
	$('#infoSystemText').val('');
}, 2000);
​
	
//Prevents scrolling on mobile devices
$(document).on('touchmove', function(e) {
    e.preventDefault();
});