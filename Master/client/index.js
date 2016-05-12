var socket = io();
var userId = "user";
//Tableau qui contient les voitures connectées
var carsConnected = [];
// Etats du système
var etatConnV1 = 0;
var etatConnV2 = 0;
var platooningState = 0;
var state= 0;

// ---------------- Pour commandes voiture ------------------

//envoie la commande de 
$('#acc-slider').slider().on('slide',function(val) {

	if(state==4) {
		socket.emit('terminatePlatooning');
	}

	dutyCycle = val.value;
	socket.emit('updateDuty',dutyCycle);
});

var boutonTourneGauche = $('#bouton-tourne-gauche');
var boutonTourneDroite = $('#bouton-tourne-droite');

boutonTourneGauche.on('touchstart',function(){
	if (state == 4) {
		socket.emit('terminatePlatooning');
	}

	socket.emit('tourneGauche');
});

boutonTourneGauche.on('touchend',function(){
	socket.emit('arreteTourner');
});

boutonTourneDroite.on('touchstart',function(){

	if (state == 4) {
		socket.emit('terminatePlatooning');
	}

	socket.emit('tourneDroite');
});

boutonTourneDroite.on('touchend',function(){
	socket.emit('arreteTourner');
});

var boutonState = $('#bouton-change-dir');

boutonState.on('click', function() {

	if(state == 3) {
		socket.emit('initiatePlatooning');
	} else if (state == 4) {
		socket.emit('terminatePlatooning');
	};

});


//Prevents scrolling on mobile devices
$(document).on('touchmove', function(e) {
    e.preventDefault();
});



// ----------------------------------------- State switching ----------------------------------------------

socket.on('changeStateToWeb', function(msg){
	state = msg.State;

	var leftButton = $("#bouton-tourne-gauche");
	var rightButton = $("#bouton-tourne-droite");
	var platoonButton = $("#bouton-change-dir");

	switch(state) {
    case 0:
        //offline
        leftButton.addClass("btn-default");
        leftButton.removeClass("btn-success");
        rightButton.addClass("btn-default");
        rightButton.removeClass("btn-success");

        platoonButton.disabled = true;
        platoonButton.text('Offline');
        platoonButton.addClass("btn-danger");
        platoonButton.removeClass("btn-warning");
        platoonButton.removeClass("btn-success");
        platoonButton.removeClass("btn-info");
        platoonButton.removeClass("btn-primary");
        break;
    case 1:
        //connected
        leftButton.removeClass("btn-default");
        leftButton.addClass("btn-success");
        rightButton.removeClass("btn-default");
        rightButton.addClass("btn-success");

        platoonButton.disabled = true;
        platoonButton.text('Connected');
        platoonButton.addClass("btn-primary");
        platoonButton.removeClass("btn-warning");
        platoonButton.removeClass("btn-success");
        platoonButton.removeClass("btn-info");
        platoonButton.removeClass("btn-danger");

        break;
    case 2:
    	//proximity
    	leftButton.removeClass("btn-default");
        leftButton.addClass("btn-success");
        rightButton.removeClass("btn-default");
        rightButton.addClass("btn-success");

        platoonButton.disabled = true;
        platoonButton.text('Proximity to car');
        platoonButton.addClass("btn-warning");
        platoonButton.removeClass("btn-primary");
        platoonButton.removeClass("btn-success");
        platoonButton.removeClass("btn-info");
        platoonButton.removeClass("btn-primary");

    	break;
    case 3:
    	//ready to platoon
    	leftButton.removeClass("btn-default");
        leftButton.addClass("btn-success");
        rightButton.removeClass("btn-default");
        rightButton.addClass("btn-success");

        platoonButton.disabled = false;
        platoonButton.text('Click to engage platooning');
        platoonButton.addClass("btn-success");
        platoonButton.removeClass("btn-warning");
        platoonButton.removeClass("btn-danger");
        platoonButton.removeClass("btn-info");
        platoonButton.removeClass("btn-primary");

    	break;
	case 4:
		//platooning
		leftButton.removeClass("btn-default");
        leftButton.addClass("btn-success");
        rightButton.removeClass("btn-default");
        rightButton.addClass("btn-success");

        platoonButton.disabled = false;
        platoonButton.text('Platooning (click to stop)');
        platoonButton.addClass("btn-info");
        platoonButton.removeClass("btn-warning");
        platoonButton.removeClass("btn-success");
        platoonButton.removeClass("btn-danger");
        platoonButton.removeClass("btn-primary");

		break;

    default:
        break;
	}

});

//Demande l'état du système périodiquement pour rester au courant.
var wd = 0;

setInterval(function(){
	wd ++;
	if(wd > 4) {
		wd=4;
		$("#connection-warning").show();
	} else {
		$("#connection-warning").hide();
	}
	socket.emit('requestState');
},1000);

//verification connexion;
socket.on('wdWeb',function(){
	wd = 0;
});

//Emergency
socket.on('emergencyStop',function(){
	$("#emergency-stop").show();
});





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





// Things we dont use anymore.



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


//test de connexion avec serveur



