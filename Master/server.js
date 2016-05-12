
//Creation du server
var app = require('express')();
var http = require('http').Server(app);
var express = require('express');
var path = require('path');

//Creation du socket
var io = require('socket.io')(http);

// Standard router
app.get('/', function(req, res) {
    //Join all arguments together and normalize the resulting path.
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});

app.get('/mobile', function(req, res) {
    //Join all arguments together and normalize the resulting path.
    res.sendFile(path.join(__dirname + '/client', 'mobile.html'));
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));

//Configuration des evennements locaux
var events = require('events');
var eventEmitter = new events.EventEmitter();

//Tableau qui contient les voitures connectées
var carsConnected = [];
var uuid_liste = [];

var car1Plat = {};
var car2Plat = {};

// Etats du système
var etatConnV1 = 0;
var etatConnV2 = 0;
var platooningState = 0;
var state = 0;

//variables watchdog
wd1=0;
wd2=0;

//Fonction periodique watchdog
setInterval(function(){
	if (etatConnV1 == 1) {
		wd1 ++;
		if(wd1>7) {
			etatConnV1 = 0;
			console.log('connection lost to car 1');
		} 
	}

	if (etatConnV2 == 1) {
		wd2 ++;
		if (wd2>7) {
			etatConnV2=0;
			console.log('connection lost to car 2');
		}
	}

	// si on pert la connection d'une des voitures pendant le platooning
	if ((state == 4)&&((etatConnV1==0)||(etatConnV2==0))) {
		eventEmitter.emit('emergencyStop');
	}

	io.emit('wdFromServer');

},1000);

//EmergencyStop
eventEmitter.on('emergencyStop',function(){
	etatConnV2=0;
	etatConnV1=0;
	io.emit('emergencyStop');
	console.log('egergency stop');
});


//Check platooning state
eventEmitter.on('checkPlatooning',function(){
	//Verifie si les deux objets sont initialisés --> 
	if (Object.keys(car1Plat).length !== 0 && Object.keys(car2Plat).length !== 0) {
		if (car1Plat.found_device === car2Plat.found_device) {
			platooningState = 1;
			console.log('platooning possible');
		}
	}
})


//Fonction qui se déclenche quand il y a une nouvelle connection
//un emit sur io correspond a un broadcast, alors qu'un emit sur socket dans la fonction répond a la connection qui a fait la demande.
//Pour s'addresser au client web, nous faisons un broadcast avec des messages spésifiquement a eux.

io.on('connection', function(socket) {

	io.emit('uuid_liste',{liste:uuid_liste});

	// -------------------------------- connection managemnet -----------------------------------

	socket.on('connectCar', function(msg){
		//Ajoute l'identification iBeacon dans le tableau de voitures connectées
		carsConnected.push(msg);
		uuid_liste.push(msg.UUID);
		//Met a jour l'etat de la connection
		if (msg.ID == 1) {
			state = 1;
			etatConnV1 = 1;
			wd1=1;
		} else if (msg.ID == 2) {
			etatConnV2 = 1;
			wd2 = 1;
		}
		socket.emit('ackConnectCar');

		console.log('car connected');
	});

	socket.on('wdToServer',function(msg){
		if(msg.ID == 1) {
			if(wd1 != 0) {
				wd1--;
			}
		} else if (msg.ID == 2) {
			if(wd2 != 0) {
				wd2--;
			}
		}
	});

	// ----------------------- iBeacon management ------------------------------------

	socket.on('found_device', function(msg) {

		if (msg.ID == 1 ){
			car1Plat = msg;
		} else if (msg.ID == 2) {
			car2Plat=msg;
		}
		eventEmitter.emit('checkPlatooning');
	    console.log('found device');
	});
          
	socket.on('lost_device', function(msg) {
	    io.emit('lostDeviceToClient',msg);
	});

	socket.on('requestInfo', function(){
		socket.emit('infoToWeb',{car1:etatConnV1,car2:etatConnV2,plat:platooningState,connectedCars:carsConnected});
	})

	// -------------------- State management ------------------------------------------------------
	var stateV1 = 0;
	
	socket.on('alert', function(msg) {
		if (msg.ID == 1){
			stateV1 = msg.State;
			console.log('Wrong state before change - car 1');
		} else if (msg.ID == 2){
			stateV2 = msg.State;
			console.log('Wrong state before change - car 2');
		}
	})


	// ----------------------- Motor commands ---------------------
	socket.on('updateDuty',function(dutyCycle){
		console.log(dutyCycle);
		io.emit('setDutyCycle',dutyCycle);
	})

	socket.on('tourneGauche',function(){
		console.log("tourne a gauche");
		io.emit('setTourneGauche');
	})

	socket.on('tourneDroite',function(){
		console.log("tourne a droite");
		io.emit('setTourneDroite');
	})

	socket.on('arreteTourner',function(){
		console.log("arrete de tourner");
		io.emit('setArreteTourner');
	})

	socket.on('changeDir',function(){
		console.log('change direction');
		io.emit('switchAvantArriere');
	})
	

});

http.listen(8001,function(){
	console.log('Listening on port 8001');
});




