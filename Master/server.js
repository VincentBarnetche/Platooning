
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
var uuid_liste = ['5affffffffffffffffffffffffffffff'];

var car1Plat = {};
var car2Plat = {};

var car1 = {found:false, found_uuid:'', uuid:'', id:0}
var car2 = {found:true, found_uuid:'e2c56db5dffb48d2b060d0f5a71096e0', uuid:'5affffffffffffffffffffffffffffff', id:2}

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
		if(wd1>4) {
			etatConnV1 = 0;
			var removedItem = uuid_liste.splice(uuid_liste.indexOf(car1.uuid),1); 
			console.log('connection lost to car 1');
			io.emit('changeStateToWeb', {State:state});
		} 
	}

	if (etatConnV2 == 1) {
		wd2 ++;
		if (wd2>4) {
			etatConnV2=0;
			var removedItem = uuid_liste.splice(uuid_liste.indexOf(car2.uuid),1); 
			console.log('connection lost to car 2');
		}
	}

	// si on pert la connection d'une des voitures pendant le platooning

	// avec voiture 2: if ((state == 4)&&((etatConnV1==0)||(etatConnV2==0))) {

	if ((state == 4)&&((etatConnV1==0))) {
		eventEmitter.emit('emergencyStop');
	}

	if(etatConnV1==0) {
		state = 0;
	}


	io.emit('wdFromServer');

},1000);


//EmergencyStop

eventEmitter.on('emergencyStop',function(){
	etatConnV2=0;
	etatConnV1=0;
	io.emit('emergencyStop');
	console.log('emergency stop');
});


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
			io.emit('changeStateToWeb', {State:state});
			etatConnV1 = 1;
			wd1=1;
			car1.uuid = msg.UUID;
			car1.id = msg.ID;
			uuid_liste.push(car1.uuid);
			console.log('car 1 connected');
		} else if (msg.ID == 2) {
			etatConnV2 = 1;
			wd2 = 1;
			car2.uuid = msg.UUID;
			car2.id = msg.ID;
			uuid_liste.push(car2.uuid);
			console.log('car 2 connected');
		}
		socket.emit('ackConnectCar');
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


	// -------------------- State management ------------------------------------------------------
	socket.on('alert', function(msg) {
		state = msg.State;
		io.emit('changeStateToWeb', {State:state});
		console.log('Wrong state before change')
	});

	socket.on('requestState', function(){
		io.emit('changeStateToWeb', {State:state});
		socket.emit('wdWeb');
	});

	socket.on('stateChange', function(msg) {
		state = msg.State;
		io.emit('changeStateToWeb', {State:state});
	})

	// ----------------------- Proximity ---------------------------


	socket.on('found_device', function(msg) {
		if (state == 1 || state == 2) {
			if(msg.ID == 1){
				car1.found = true;
				car1.found_uuid = msg.foundUUID;
				if ((car2.found) && (car2.uuid == car1.found_uuid) && (car1.uuid == car2.found_uuid)) {
					state = 2;
					io.emit('setStateProx');
					io.emit('changeStateToWeb', {State:state});
				}	
			}
			if(msg.ID == 2){
				car2.found == true;
				car2.found_uuid = msg.foundUUID;
				if ((car1.found) && (car2.uuid == car1.found_uuid) && (car1.uuid == car2.found_uuid)) {
					state = 2;
					io.emit('setStateProx');
					io.emit('changeStateToWeb', {State:state});
				}	
			}
		}
	});

	socket.on('lost_device', function(msg) {
		if (state == 1 || state == 2) {
			if (msg.ID == 1){
				car1.found = false;
			}
			if (msg.ID == 2){
				car2.found = false;
			}
			state = 1;
			io.emit('changeStateToWeb', {State:state});
			io.emit('setStateNotProx');
		}
	});

	// ----------------------- Platooning ------------------------


	socket.on('initiatePlatooning', function() {
		if (state == 3) {
			state = 4;
			console.log('initiate platooning');
			io.emit('startPlatooning');
			io.emit('changeStateToWeb', {State:state});
		}
	});

	socket.on('terminatePlatooning', function() {
		if (state == 4) {
			state=3;
			console.log('stop platooning');
			io.emit('stopPlatooning');
			io.emit('changeStateToWeb', {State:state});
		}
	});

	socket.on('updateLoiCommande',function(msg){
		io.emit('updateLoiCommandeWeb',msg);
	});

	// ----------------------- Motor commands ---------------------
	socket.on('updateDuty',function(dutyCycle){
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




