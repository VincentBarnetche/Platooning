

// --------------- // --------------Declaration and initiation of variables------------------ // --------------------

//-----------------------------> Import of libraries
var socket = require('socket.io-client')('http://192.168.43.232:8001');
var fs = require('fs');

//Configuration des evennements locaux
var events = require('events');
var eventEmitter = new events.EventEmitter();

var bleno = require('bleno');
var bleacon = require('bleacon');

// Segmentation fault handler
var Segfault = require('segfault');
Segfault.registerHandler("segfaults.txt");

//--------------------------------> Connection management
var connected = 0;
var wd = 0; //watchdog counter
var state = 0; //0 -> Offline, 1 -> Connected, 2 -> Proximity to other car, 3 -> ready to engage platooning, 4 -> platooning


//--------------------------------> iBeacon
var userId = 1; //car ID
var userUuid = 'e2c56db5dffb48d2b060d0f5a71096e0'; // car BLE ID

var major = 0; //iBeacon attribute
var minor = 0; //iBeacon attribute
var measuredPower = -59; //iBeacon attribute - emitting power

var device_near = 0;  //spots if an other iBeacon is close
var found_device = false;  //tracks if the found device is part of the platooning system
var uuid_found=0 ; //ID of the found car.
var uuid_liste = []; //List of UUIDs in the platooning system. Synced with server.

var temp=0; // variable for managing syncronization of uuid_liste
var temp2=0; // variable for managing syncronization of uuid_liste

var compt=0; //variable for managing car proximity detection

//--------------------------------> State managemnet

//--------------------------------> Commandes moteur
var commandeActive=0;
var rapportCyclique=1;
var mraa = require ("mraa");
var pwm1 = new mraa.Pwm(3);
var pwm2 = new mraa.Pwm(5);
pwm1.period_us(20000);
pwm2.period_us(20000);
pwm1.enable(true);
pwm2.enable(true);
pwm1.write(1.0);
pwm2.write(1.0);

//sortie pour gérer la direction du moteur
var direction1 = new mraa.Gpio(2);
direction1.dir(mraa.DIR_OUT); 
direction1.write(1); 
var direction2 = new mraa.Gpio(4);
direction2.dir(mraa.DIR_OUT); 
direction2.write(0); 

var tournerGauche = new mraa.Gpio(8);
var tournerDroite = new mraa.Gpio(9);
tournerGauche.dir(mraa.DIR_OUT);
tournerDroite.dir(mraa.DIR_OUT);
tournerGauche.write(0);
tournerDroite.write(0);

//---------------------------> Loi de commande
var consigne = 25;
var deltaDistN=0;
var deltaDistN1=0;
var sumDeltaDist = 0;

var Kp =0.04;
var Ki =0;
var Kd =0;
var Tau1 = Kp/Ki;
var Tau2 = 1/Kp;
var Te = 0.01;

var cmde;
var dist;
var valCap; //For storing distance sensor
var valGauche; //For storing left distance sensor
var valDroite; //For storing right distance sensor

var capteurDistance = new mraa.Aio(0);
var capteurDistanceG = new mraa.Aio(1);
var capteurDistanceD = new mraa.Aio(2);

var capteurRoueDevant = new mraa.Gpio(10);
capteurRoueDevant.dir(mraa.DIR_IN);

var turningRight = 0;
var turningLeft = 0;

var sendingCounder = 0; //for sending updates

//var capteurDistanceD = new mraa.Aio(1);

//capteurDistanceG.dir(mraa.DIR_IN);
//capteurDistanceD.dir(mraa.DIR_IN);

// ----------------- // ----------------- Static Functions ------------------- // ---------------------

//Connection management

var watchdogTestPeriodique=function(){}; // for making watchdogTest function periodic

var watchdogTest = function(){
	wd++;
	if (wd>7) {
		emergencyStop();
		console.log('Watchdog expired');
	}
	socket.emit('wdToServer',{ID:userId});
}

var emergencyStop = function(){
	//Met le système en état de non connection.
	connected = 0;
	//Arrète la tache periodique de watchdog.
	clearInterval(watchdogTestPeriodique);
	pwm1.enable(false);
	pwm2.enable(false);
	console.log('Emergency stop');
}

//iBeacon

setTimeout(function(){
	//Fake function for simulating device detection
	uuid_found = '5affffffffffffffffffffffffffffff';
	console.log('sender fake melding om funnet')
	socket.emit('found_device', {ID: userId, UUID: userUuid, foundUUID: uuid_found});
},7000);


//State management
var checkInFront = function(){};


//Commandes moteur

var tacheLoiDeCommande = function(){};
var tacheLoiDeCommandeVolant = function(){};

//Loi de commande
var loiDeCommande = function() {
	//algo de commande

	//calcul de distance
	dist = 0;
	for (var i =0; i < 3; i++) {
		valCap = capteurDistance.readFloat()*1.5; // *1.5 to adapt from 3.3V to 5V alimentation of sensor for equation.
		dist += (-220.52)*valCap*valCap*valCap + 436.73*valCap*valCap - 348.66*valCap + 127.7;
	};

	dist = dist/3;

	deltaDistN = dist-consigne;
	sumDeltaDist += deltaDistN;
	if (sumDeltaDist > 10) {sumDeltaDist=10;}
	if(sumDeltaDist < -10) {sumDeltaDist=-10;}

	//PI
	//rapportCyclique = rapportCyclique - ((Te/2 + Tau1)/Tau2)*deltaDistN + ((Te/2 - Tau1)/Tau2)*deltaDistN1 ;

	//PID
	rapportCyclique = Kp*deltaDistN +Ki*sumDeltaDist + Kd*(deltaDistN-deltaDistN1);
	rapportCyclique = 1 - rapportCyclique;

	deltaDistN1 = deltaDistN;

	if (rapportCyclique>1) {rapportCyclique=1;}
	if(rapportCyclique<0) {rapportCyclique=0;}

	pwm1.write(rapportCyclique);
	pwm2.write(rapportCyclique);

	//Sends updates to frontend for distance to next car and DC
	sendingCounder++;
	if(sendingCounder>30) {
		sendingCounder=0;
		socket.emit('updateLoiCommande',{dutyCycle:rapportCyclique,distance:dist});
	}

};
var cntr=0;
var loiDeCommandeVolant = function(){
	//Steering wheel regulation
	valDroite = capteurDistanceD.readFloat(); //readFloat returns value between 0 and 1
	valGauche = capteurDistanceG.readFloat();

	if (turningLeft==1){
		cntr ++;
		if(cntr>=2) {
			tournerDroite.write(1);
			setTimeout(function(){
				tournerDroite.write(0);
				turningLeft=0;
			},50);
			cntr=0;
		}
	} else if (turningRight==1) {
		cntr++;
		if(cntr>=2) {
			tournerGauche.write(1);
			setTimeout(function(){
				tournerGauche.write(0);
				turningRight=0;
			},50);
			cntr=0;
		}
	} else if (valDroite<0.25) {
		tournerGauche.write(1);
		setTimeout(function(){
			tournerGauche.write(0);
		},50);
		turningLeft=1;
	} else if (valGauche<0.25) {
		tournerDroite.write(1);
		setTimeout(function(){
			tournerDroite.write(0);
		},50);
		turningRight=1;
	};

};



// ----------------- // ----------------- Dynamic event management ------------------- // ---------------------


// --------------------------------- Connection management ---------------------------------------

socket.on('connect', function(){
	socket.emit('connectCar',{ID:userId,UUID:userUuid});
});

socket.on('ackConnectCar',function(){
	connected = 1;
	wd = 1;
	state=1;
	watchdogTestPeriodique = setInterval(watchdogTest,1000);
	eventEmitter.emit('activateiBeacon');
	console.log('connected');
});

//Watchdog
socket.on('wdFromServer',function(){
	wd--;
});

socket.on('emergencyStop',emergencyStop);

// ----------------------------------------- iBeacon -------------------------------------------------------

// Activate iBeacon
eventEmitter.on('activateiBeacon', function(){
    // Bleacon scanning for device
    bleacon.startScanning();  
});

/*
bleno.on('stateChange', function(beaconState) {
    console.log('on -> stateChange: ' + beaconState);
    if (beaconState === 'poweredOn') {
		//bleno.startAdvertisingIBeacon(userUuid, major, minor, measuredPower);
        console.log("Advertising iBeacon");
    }
    else {
        bleno.stopAdvertising();
    }
});

*/

// Update list of connected cars - UUID 
socket.on('uuid_liste', function (msg) { 

	if (typeof msg != 'undefined') {

	    // Add the UUIDs not currently in the local list
	    for (i = 0 ; i < msg.liste.length ; i++){
	        temp = msg.liste[i];
	        if (uuid_liste.indexOf(temp) === -1){       // -1 : not present in the array
	            uuid_liste.push(temp);
	        }
	    }
	    // Remove the UUIDs no longer present in the global list
	    for (i = 0; i < uuid_liste.length ; i++){
	        temp2 = uuid_liste[i];
	        if(msg.liste.indexOf(temp2) === -1){            // -1 : not present in the array
	            uuid_liste.splice(i,1); 
	    	}
	    }
	}
});

// Searching iBeacon
bleacon.on('discover', function(bleacon) {
    compt = 0;
    if (typeof bleacon != 'undefined') {
	    // Parcourir la liste des uuids connetcées au serveur
	    uuid_liste.forEach(function(item, index, array){
	        if (bleacon.uuid === item) {
	            compt = compt + 1;
	            if((bleacon.proximity === 'near') || (bleacon.proximity === 'immediate')){
	               device_near = device_near + 1 ;
	            } else {
	                device_near = 0;
	            }
	            if ((device_near > 10) && (found_device === false )){
	                found_device = true;
	                uuid_found = bleacon.uuid;
	                socket.emit('found_device', {ID: userId, UUID: userUuid, foundUUID: uuid_found});			// TO SERVER - found_device
	            }
	            if ((device_near < 10) && (found_device === true)){
	                found_device = false;
	                socket.emit('lost_device', {ID:userId, UUID:userUuid});										// TO SERVER - lost_device
	            }
	        }
	    });
	    if((compt === 0) && (found_device === true)){
	        found_device = false;
	        socket.emit('lost_device', {ID: userId,UUID:userUuid});												// TO SERVER - lost_device
	    }
	}
});


// ---------------------------------- State management ------------------------------------------------------

socket.on('setStateProx', function(){
	console.log("state is "+state)
	bleacon.stopScanning();
	if (state == 1) {
		state = 2;
		eventEmitter.emit('activateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId, State:state});                      	// TO SERVER - alert 
	}
});

socket.on('setStateNotProx', function(){
	if (state == 2) {
		state = 1;
		eventEmitter.emit('deactivateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId,State:state});							// TO SERVER - alert
	}
});

socket.on('startPlatooning', function(){
	if (state == 3){
		console.log('Platooning activated');
		state = 4;
		eventEmitter.emit('activateLoiCommande');
		eventEmitter.emit('deactivateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId,State:state});							// TO SERVER - alert
	}
});

socket.on('stopPlatooning', function(){
	if (state == 4) {
		console.log('Platooning deactivated');
		state = 3;
		eventEmitter.emit('deactivateLoiCommande');
		eventEmitter.emit('activateCheckInFront');
		pwm1.write(1);
		pwm2.write(1);
	} else {
		socket.emit('alert', {ID:userId,State:state});							// TO SERVER - alert
	}
})

eventEmitter.on('activateCheckInFront', function(){
	    checkInFront = setInterval(function(){
	    	var capDistVal =  capteurDistance.readFloat();
	    	var distFront = (-220.52)*capDistVal*capDistVal*capDistVal + 436.73*capDistVal*capDistVal - 348.66*capDistVal + 127.7;

		if (distFront < 70){
			state = 3;
			socket.emit('stateChange', {ID:userId,State:state});				// TO SERVER - stateChange
		} else {
			state = 2;
			socket.emit('stateChange', {ID:userId,State:state});				// TO SERVER - stateChange
		}
	}, 500); //0.5s
})

eventEmitter.on('deactivateCheckInFront', function(){
	clearInterval(checkInFront);
});

// ----------------------------------------- Commandes moteur -----------------------------------------------

socket.on('setDutyCycle',function(dutyCycle){
	if((commandeActive==0)&&(typeof dutyCycle != 'undefined')) {
		dutyCycle = Number(dutyCycle);
		rapportCyclique = dutyCycle;
		pwm1.write(dutyCycle);
		pwm2.write(dutyCycle);
	}
});

socket.on('setTourneGauche',function(){
	//tourner a gauche
	if(commandeActive==0){
		tournerGauche.write(1);
		console.log("tourne gauche");
	}
})

socket.on('setTourneDroite',function(){
	//tourner a droite
	if(commandeActive==0){
		tournerDroite.write(1);
		console.log("tourne droite");
	}
})

socket.on('setArreteTourner',function(){
	//Arreter de tourner le volant
	tournerGauche.write(0);
	tournerDroite.write(0);
});

// ------------------------------------- loi de commande --------------------------------


//Réutilisation de fonction pour tester l'activation/desactivation de loi de commande

socket.on('switchAvantArriere',function(){
	if(commandeActive == 0) {
		//activer la commande
		commandeActive = 1;
		tacheLoiDeCommande = setInterval(loiDeCommande,10);
		console.log('debut commande');
	} else {
		//arreter la commande
		commandeActive = 0;
		clearInterval(tacheLoiDeCommande);
		console.log('arrete commande');
	}
});

//Local events for state changing		
eventEmitter.on('activateLoiCommande', function(){
	commandeActive = 1;
	tacheLoiDeCommandeVolant = setInterval(loiDeCommandeVolant,120);
	tacheLoiDeCommande = setInterval(loiDeCommande,10);
});

eventEmitter.on('deactivateLoiCommande', function(){
	commandeActive = 0;
	clearInterval(tacheLoiDeCommandeVolant);
	clearInterval(tacheLoiDeCommande);
});



