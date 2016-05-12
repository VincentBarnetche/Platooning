var socket = require('socket.io-client')('http://10.32.0.66:8001');
var fs = require('fs');

//Configuration des evennements locaux
var events = require('events');
var eventEmitter = new events.EventEmitter();

var userId = 2;
var userUuid = 'e2c56db5dffb48d2b060d0f5a71096e1';

//Etats
var connected = 0;
var wd = 0;
var uuid_liste = [];

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
	}
});
​
socket.on('setStateNotProx', function(){
	if (state == 2) {
		state = 1;
		eventEmitter.emit('deactivateCheckInFront');
	}
});
​
socket.on('startPlatooning', function(){
	state=4;
});
​
socket.on('stopPlatooning', function(){
	state=3;
})
​
​
​