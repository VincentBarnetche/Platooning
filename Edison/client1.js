var socket = require('socket.io-client')('http://10.32.0.66:8001');
var fs = require('fs');

//Configuration des evennements locaux
var events = require('events');
var eventEmitter = new events.EventEmitter();

var userId = 2;
var userUuid = 99999888;

//Etats
var connected = 0;
var wd = 0;

var state = 0; //0 -> Offline, 1 -> Connected, 2 -> Proximity to other car, 3 -> ready to engage platooning, 4 -> platooning

// -------------------------------------- Connection management -------------------------------------------

//Threads de communication
socket.on('connect', function(){
	socket.emit('connectCar',{ID:userId,UUID:userUuid});
});

socket.on('ackConnectCar',function(){
	connected = 1;
	wd = 1;
	var watchdogTestPeriodique = setInterval(watchdogTest,1000);
	console.log('connected');
});

//Watchdog
socket.on('wdFromServer',function(){
	wd--;
});

//Fonctions periodiques

var watchdogTest = function(){
	wd++;
	if (wd>7) {
		emergencyStop();
		console.log('Watchdog expired');
	}
	socket.emit('wdToServer',{ID:userId});
}

//Fonctions
var emergencyStop = function(){
	//Met le système en état de non connection.
	connected = 0;
	//Arrète la tache periodique de watchdog.
	clearInterval(watchdogTestPeriodique);
	pwm1.enable(false);
	pwm2.enable(false);
	console.log('Emergency stop');
}

//Evennements locaux
eventEmitter.on('connected',function(){
	//Mettre en place le watchdog +++
	//Pourquoi cette fonction?? 
})


// ----------------------------------------- iBeacon -------------------------------------------------------
​
var bleno = require('bleno');
var bleacon = require('bleacon');
//var uuid  = 'e2c56db5dffb48d2b060d0f5a71096e0';
var major = 0;
var minor = 0;
var measuredPower = -59;
​
// Activate iBeacon
eventEmitter.on('activateiBeacon', function(){
	bleno.on('stateChange', function(state) {
        console.log('on -> stateChange: ' + state);
​
        if (state === 'poweredOn') {
            bleno.startAdvertisingIBeacon(
                userUuid, major, minor, measuredPower);
            //console.log("Advertising!!! Hurra!");
        }
        else {
            bleno.stopAdvertising();
        }
    });
​
    // Bleacon scanning for device
    bleacon.startScanning();  
    var device_near = 0;  
    var found_device = false;  
    var uuid_found=0 ;
});
​
var uuid_liste = [];

// Update list of connected cars - UUID 
socket.on('uuid_liste', function (msg) { 
    // Add the UUIDs not currently in the local list
    for (i = 0 ; i < msg.liste.length ; i++){
        var temp = msg.liste.uuid[i];
        if (uuid_liste.indexOf(temp) === -1){       // -1 : not present in the array
            var newLength = uuid_liste.push("temp")
        }
    }
    // Remove the UUIDs no longer present in the global list
    for (i = 0; i < uuid_liste.length ; i++){
        var temp2 = uuid_liste[i];
        if(msg.liste.uuid.indexOf(temp2) === -1){            // -1 : not present in the array
            var removedItem = uuid_liste.splice(pos,i); 
    }
});
​
// Searching iBeacon
bleacon.on('discover', function(bleacon) {
    console.log('discover');
    var compt = 0;
    // Parcourir la liste des uuids connetcées au serveur
    uuid_liste.forEach(function(item, index, array){
        if (bleacon.uuid === item) {
            compt = compt + 1;
            if((bleacon.proximity === 'near') || (bleacon.proximity === 'immediate')){
               device_near = device_near + 1 ;
            } else {
                device_near = 0;
            }
            if ((device_near > 10) && (found_device === false ){
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
});


// ---------------------------------- State management ------------------------------------------------------
​
socket.on('setStateProx', function(){
	if (state == 1) {
		state = 2;
		eventEmitter.emit('activateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId, State:state});                      	// TO SERVER - alert 
	}
});
​
socket.on('setStateNotProx', function(){
	if (state == 2) {
		state = 1;
		eventEmitter.emit('deactivateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId,State:state});							// TO SERVER - alert
	}
});
​
socket.on('startPlatooning', function(){
	if (state == 3){
		state = 4;
		eventEmitter.emit('activateLoiCommande');
		eventEmitter.emit('deactivateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId,State:state});							// TO SERVER - alert
	}
});
​
socket.on('stopPlatooning', function(){
	if (state == 4) {
		state = 3;
		eventEmitter.emit('deactivateLoiCommande');
		eventEmitter.emit('activateCheckInFront');
	} else {
		socket.emit('alert', {ID:userId,State:state});							// TO SERVER - alert
	}
})
​
​
eventEmitter.on('activateCheckInFront', function(){
	var checkInFront = setInterval(function(){
		if (capteurDistanceG.readFloat() < ?){
			state = 3;
			socket.emit('stateChange', {ID:userId,State:state});				// TO SERVER - stateChange
		} else {
			state = 2;
			socket.emit('stateChange', {ID:userId,State:state});				// TO SERVER - stateChange
		}
	}, 500); //0.5s
})
​
eventEmitter.on('deactivateCheckInFront', function(){
	clearInterval(checkInFront);
})
​

// ----------------------------------------- Commandes moteur -----------------------------------------------
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

socket.on('setDutyCycle',function(dutyCycle){
	if(commandeActive==0) {
		dutyCycle = Number(dutyCycle);
		rapportCyclique = dutyCycle;
		console.log(dutyCycle);
		pwm1.write(dutyCycle);
		pwm2.write(dutyCycle);
	}
});

var tourneGauche = new mraa.Gpio(8);
var tournerDroite = new mraa.Gpio(9);
tourneGauche.dir(mraa.DIR_OUT);
tournerDroite.dir(mraa.DIR_OUT);
tourneGauche.write(0);
tournerDroite.write(0);

socket.on('setTourneGauche',function(){
	//tourner a gauche
	if(commandeActive==0){
		tourneGauche.write(1);
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
	tourneGauche.write(0);
	tournerDroite.write(0);
});




// ------------------------ loi de commande --------------------------------
var consigne = 50;
var deltaDistN=0;
var deltaDistN1=0;
var sumDeltaDist = 0;

var Ki = 0;
var Kp = 0.01;
var Kd = 0;
var Tau1 = Kp/Ki;
var Tau2 = 1/Kp;
var Te = 0.01;

var cmde;
var dist;
var valGauche;

var capteurDistanceG = new mraa.Aio(0);
//var capteurDistanceD = new mraa.Aio(1);

//capteurDistanceG.dir(mraa.DIR_IN);
//capteurDistanceD.dir(mraa.DIR_IN);

var loiDeCommande = function() {
	//algo de commande

	//calcul de distance
	
	//var valDroite = capteurDistanceD.read();
	dist = 0;
	for (var i =0; i < 3; i++) {
		valGauche = capteurDistanceG.readFloat();
		dist += 1210.4*valGauche*valGauche-699.17*valGauche*valGauche*valGauche-758.37*valGauche+198.24;
	};
	dist = dist/3;

	deltaDistN = dist-consigne;
	sumDeltaDist += deltaDistN;
	if (sumDeltaDist > 500) {sumDeltaDist=100;}
	if(sumDeltaDist < -500) {sumDeltaDist=-100;}

	//PI
	//rapportCyclique = rapportCyclique - ((Te/2 + Tau1)/Tau2)*deltaDistN + ((Te/2 - Tau1)/Tau2)*deltaDistN1 ;

	//PID
	rapportCyclique = Kp*deltaDistN +Ki*sumDeltaDist + Kd*(deltaDistN-deltaDistN1);
	rapportCyclique = 1 - rapportCyclique;

	deltaDistN1 = deltaDistN;

	if (rapportCyclique>0.75) {rapportCyclique=0.75;}
	if(rapportCyclique<0) {rapportCyclique=0;}

	pwm1.write(rapportCyclique);
	pwm2.write(rapportCyclique);

};

//Réutilisation de fonction pour tester l'activation/desactivation de loi de commande

var tacheLoiDeCommande;

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
	tacheLoiDeCommande = setInterval(loiDeCommande,10);
});
​
eventEmitter.on('deactivateLoiCommande', function(){
	commandeActive = 0;
	clearInterval(tacheLoiCommande);
})
​



