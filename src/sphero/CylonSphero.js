/**
 *  Command the Sphero via established bluetooth connection on /dev/ttyX
 *    Use Cylon lib             http://cylonjs.com/
 *    TODO: Use thread library  https://github.com/audreyt/node-webworker-threads
 */

var Cylon = require('cylon');
global.Cylon = global.Cylon || Cylon;       // To simplify in the callbacks and avoid closures

// Sphero & log events
var SpheroEvents    = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here

// Sphero colors (associative array, dark & light)
global.SPHERO_COLORS = { "red": [0x7F0000, 0xFF0000], "green": [0x007F00, 0x00FF00],
    "blue": [0x00007F, 0x0000FF], "yellow": [0x007F7F, 0x00FFFF], "purple": [0x7F7F00, 0xFFFF00]
};

// -----------------------------------------------------------------------------
global.STARTING_POS_Y_CORRECTION = 20;


// Threads lib from  https://www.npmjs.com/package/webworker-threads => Segmentation fault!!
///var Threads = require('webworker-threads');
///var FS      = require('fs');

// Every time a bluetooth device is found:
//   SE.emit( "bt-device-connected", JSON.stringify({ "macAddress": macAddress, "rfcommDev": rfcommDev }) );


/**
 *  CylonSphero stores all available Spheros (after testing a ping on them)
 *    and allow Spheros to be controlled by browser code
 *
 *          TODO: Sphero color
 *          TODO: RPi Network
 */
function CylonSphero()
{
    // Dark sphero is the one set at (0,0), and Light sphero will be at (0,20)
    this.darkSpheroIndex         = 0;    // May change if the Sphero at index 0 is disconnected

    // Bluetooth and Sphero (class attributes)
    this.spheroCommPorts        = [];   // When not connected, the value is null
    this.spheroMacAddresses     = [];
    this.spheroCylonRobots      = [];   // When not connected, the value is null. WARNING: mySphero == spheroCylonRobots[].sphero
    this.spheroMacAddress2Index = [];   // Associative array to reuse the same index in case of disconnection. Note: inquire() does not return the ones already connected

    // Running code:
    this.spheroUserCodeRuns     = [];
    this.isCodeRunning          = function() {
        for( var i=0; i < this.spheroUserCodeRuns.length; i++ ) {
            if ( this.spheroUserCodeRuns[i] && this.spheroUserCodeRuns[i].sandbox._endLoop === false )
            { return true; }
        }
        return false;
    };

    // Threads to run user code
    //this.spheroUserCodeWorkers  = [];
    //this.templateUserCodeRun    = readTemplateUserCodeRun();

    // Closure for on(...)
    var _this = this;

    // --- When new device detected
    SE.on( "bt-device-connected", function(deviceDescription) {
        onBluetoothDeviceConnected( _this, deviceDescription );
    });

    // --- When user code pushed!
    SE.on( "push-code", function( userDescription ) {
        onUserCodePushed( _this, userDescription );         // spheroIndex, userCode
    });

    // --- When user stop clicked!
    SE.on( "stop-code", function( userDescription ) {
        onUserStop( _this, userDescription );               // spheroIndex
    });

    return;
}



/**
 *  SE.on( "user-code-pushed", ...)
 */
function onUserCodePushed( _this, userDescription )
{
    try {
        var userInfo    = JSON.parse( userDescription );
        var spheroIndex = fromDarkToIndex( _this, userInfo.spheroIsDark );
        if ( typeof spheroIndex === "undefined" || !userInfo.userCode ) {
            console.error("ERROR in CylonSphero onUserCodePushed: spheroIndex/userCode is null for [%s]", userInfo.spheroIndex);
            return;
        }

        // --- Check that Sphero still connected
        if ( !_this.spheroCylonRobots[ spheroIndex ] ) {
            console.error("ERROR in CylonSphero onUserCodePushed: sphero DISCONNECTED [%s]", spheroIndex);
            SE.emit( "sphero-disconnect", JSON.stringify({ "spheroIndex": spheroIndex }) );
            return;
        }

        /* // --- Existing Thread?
        var worker = _this.spheroUserCodeWorkers[ spheroIndex ];
        if (worker) {
            worker.terminate();               // Terminate the worker when needed!
        } */

        // --- Eval and execute ThreadedSpheroUserCodeRun in this worker
        var mySphero    = _this.spheroCylonRobots[ spheroIndex ].sphero;
        var userCode    = userInfo.userCode;

        // Segmentation fault!!!
        /*** worker = new Threads.Worker('src/sphero/ThreadedSpheroUserCodeRun.js');
        _this.spheroUserCodeWorkers[ spheroIndex ] = worker;
        worker.postMessage( { mySphero: mySphero, userCode: userCode, SE: SE } ); ***/


        // --- Require version, same thread
        var SpheroUserCodeRun = require("./RequireSpheroUserCodeRun");
        console.log( "\nCylonRobot [%s] REQUIRE USER-CODE completed -- run SpheroUserCodeRun NOW", spheroIndex );
        _this.spheroUserCodeRuns[spheroIndex] = new SpheroUserCodeRun( mySphero, userCode, SE );
        console.log( "\nCylonRobot [%s] SpheroUserCodeRun returned. Do not stop now, as setInterval keeps on!", spheroIndex );
        // _finalSpheroStop( _this, mySphero );
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onUserCodePushed: " + exc.stack + "\n" ); }
    return;
}



/**
 *  SE.on( "user-stop", ...)
 */
function onUserStop( _this, userDescription )
{
    try {
        var userInfo    = JSON.parse( userDescription );
        var spheroIndex = fromDarkToIndex( _this, userInfo.spheroIsDark );
        if ( typeof spheroIndex === "undefined" ) {
            console.error("ERROR in CylonSphero onUserStop: spheroIndex is null");
            return;
        }

        // --- Check that Sphero still connected
        if ( !_this.spheroCylonRobots[ spheroIndex ] ) {
            console.error("ERROR in CylonSphero onUserStop: sphero DISCONNECTED [%s]", spheroIndex);
            SE.emit( "sphero-disconnect", JSON.stringify({ "spheroIndex": spheroIndex }) );
            return;
        }

        /*** // --- Existing Thread?
        var worker = _this.spheroUserCodeWorkers[ spheroIndex ];
        if (worker) {
            worker.terminate();               // Terminate the worker when needed!
        }
        _this.spheroUserCodeWorkers[ spheroIndex ] = null;  ***/

        // --- Stop Sphero and show tail Led
        _finalSpheroStop( _this, _this.spheroCylonRobots[ spheroIndex ].sphero );
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onUserStop: " + exc.stack + "\n" ); }
    return;
}


/** Private function for onUserStop & onUserCodePushed */
function fromDarkToIndex( _this, spheroIsDark )
{
    if ( spheroIsDark ) {
        return _this.darkSpheroIndex;
    }
    // Loop over the array to find the first one valid
    for ( var i = 0; i < _this.spheroCylonRobots.length; i++) {
        if ( i == _this.darkSpheroIndex || !_this.spheroCylonRobots[i] )
            continue;
        return i;
    }
}

/** Private function for onUserStop & onUserCodePushed */
function _finalSpheroStop( _this, mySphero )
{
    var spheroIndex = mySphero.hocIndex;
    console.log( "\nCylonRobot [%s] stopping", spheroIndex );
    _this.spheroUserCodeRuns[spheroIndex].sandbox._endLoop = true;

    mySphero.stop();

    // RESET Sphero color!
    mySphero.color( mySphero.hocColor );

    mySphero.setBackLed( 255 );
    mySphero.startCalibration();
    return;
}




/**
 *  SE.on( "bt-device-connected", ...)
 */
function onBluetoothDeviceConnected( _this, deviceDescription )
{
    try {
        var deviceInfo = JSON.parse( deviceDescription );
        if ( !deviceInfo.rfcommDev || !deviceInfo.macAddress ) {
            console.error("ERROR in CylonSphero onBluetoothDeviceConnected: rfcommDev/macAddress is null for [%s]", deviceInfo.macAddress);
            return;
        }
        // When new device detected: SE.emit( "bt-device-connected", JSON.stringify({ "macAddress": macAddress, "rfcommDev": rfcommDev }) );

        // --- Create the corresponding Cylon.robot, and use the same index if was connected before
        var idx = _this.spheroMacAddress2Index[ deviceInfo.macAddress ] || _this.spheroCommPorts.length;

        var cylonRobot = global.Cylon.robot({ name: ('Sphero-' + idx) })
                .connection( 'sphero', { adaptor: 'sphero', port: deviceInfo.rfcommDev })
                .device('sphero', { driver: 'sphero' })
                .on( 'error', console.warn )
                .on( 'ready', function(my) {
                    console.log("CylonRobot ["+ my.sphero.name+"] ready, start last initializations!");

                    // Store its index inside the object. Before initCylonRobot called!
                    my.sphero.hocIndex = idx;
                    var hocColor       = global.SPHERO_COLORS[ ""+process.env.HOC_COLOR ][ _this.darkSpheroIndex == idx ? 0 : 1 ];
                    my.sphero.hocColor = hocColor ? hocColor : 0xFF00FF;
                    console.log("CylonRobot [%s] has index[%s] and color [%s]", my.sphero.name, my.sphero.hocIndex, my.sphero.hocColor.toString(16) );

                    // Init the cylonRobot with all eventListeners + initialization code (show tail Led)
                    initCylonRobot( _this, my.sphero );

                    my.sphero.color( my.sphero.hocColor );
                    // my.sphero.roll( 20, 0 );
                    // Show tail Led! And block gyroscope!
                    // my.sphero.setBackLed( 255 );
                    my.sphero.startCalibration();

                    // Ping every 10s to keep the connection open
                    // setInterval( function(){ my.sphero.ping(); }, 10000 );
                });

        // --- Now we know it is a Sphero, save info as class attributes for this Sphero
        console.log("CylonRobot index=["+ idx+"] created, MacAddress [%s] from Orbotix => assume a Sphero!\n", deviceInfo.macAddress);
        _this.spheroMacAddresses[idx]   = deviceInfo.macAddress;
        _this.spheroCommPorts[idx]      = deviceInfo.rfcommDev;
        _this.spheroCylonRobots[idx]    = cylonRobot;                       // WARNING: mySphero == spheroCylonRobots[idx].sphero
        _this.spheroMacAddress2Index[ deviceInfo.macAddress ] = idx;
        // Dark Sphero?
        if (_this.darkSpheroIndex === undefined) {
            _this.darkSpheroIndex = idx;
        }

        // --- Start Cylon: global to all spheros!
        global.Cylon.start();
        // global.Cylon.start();       // When called a second time, IT WORKS, with just the error "Serialport not open" (as already open)
    }
    catch (exc) {
        console.error( "\nTRY-CATCH ERROR in CylonSphero onBluetoothDeviceConnected: " + exc.stack + "\n" );
        if (exc && exc.stack && exc.stack.indexOf("Serialport not open") >=0 ) {
            _onDisconnect( _this, cylonRobot.sphero, idx );     // sphero.hocIndex = idx;  may not have been initialized yet
        }
    }
    return;
}



/**
 *  Init the Cylon Robot object with collision, data-streaming, ...
 */
function initCylonRobot( _this, mySphero )
{
    console.log( "CylonRobot [%s] initialization\n", mySphero.hocIndex );

    // --- AutoReconnect & InactivityTimeout
    //mySphero.setAutoReconnect( 1, 20, function(err, data) {         // 1 for yes, 20 sec, cb    // Doc https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
    //    console.log( "CylonRobot [%s] AutoReconnect error/data:", mySphero.hocIndex );
    //    //console.log( err || data );
    //});
    mySphero.setInactivityTimeout( 1800, function(err, data) {      // 30 minutes, cb    // Doc https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
        console.log( "CylonRobot [%s] InactivityTimeout error/data:", mySphero.hocIndex );
        //console.log( err || data );
    });
    mySphero.stopOnDisconnect( true, function(err, data) {
        console.log( "CylonRobot [%s] stopOnDisconnect error/data:", mySphero.hocIndex );
        //console.log( err || data );
    });
    mySphero.on( "disconnect", function() { _onDisconnect( _this, mySphero, mySphero.hocIndex ); });

    // --- Data streaming
    mySphero.on( "dataStreaming", function(data) {
        var timestamp = Date.now();
        var posYCorrection = (mySphero.hocIndex != _this.darkSpheroIndex) ? global.STARTING_POS_Y_CORRECTION : 0;
        //console.log( "CylonRobot [%s] DATA-STREAMING data:", mySphero.hocIndex );
        //console.log(data);

        // --- Set position, speed and acceleration here!
        //     WARNING: _this.darkSpheroIndex is corrected by 20 cm on Y axis!
        mySphero.timestamp  = timestamp;
        mySphero.posX       = data.xOdometer.value[0];
        mySphero.posY       = data.yOdometer.value[0] + posYCorrection;
        mySphero.speedX     = data.xVelocity.value[0];
        mySphero.speedY     = data.yVelocity.value[0];
        mySphero.accelX     = data.xAccel.value[0];
        mySphero.accelY     = data.yAccel.value[0];
        mySphero.accelOne   = data.accelOne.value[0];

        // --- Set all other Spheros
        for ( var i = 0; i < _this.spheroCylonRobots.length; i++) {
            if ( i == mySphero.hocIndex || !_this.spheroCylonRobots[i] )
                continue;
            var otherSphero         = _this.spheroCylonRobots[i].sphero;
            var posYOtherCorrection = (otherSphero.hocIndex != _this.darkSpheroIndex) ? global.STARTING_POS_Y_CORRECTION : 0;

            otherSphero.timestamp   = timestamp;
            otherSphero.posX        = data.xOdometer.value[0];
            otherSphero.posY        = data.yOdometer.value[0] + posYOtherCorrection;
            otherSphero.speedX      = data.xVelocity.value[0];
            otherSphero.speedY      = data.yVelocity.value[0];
            otherSphero.accelX      = data.xAccel.value[0];
            otherSphero.accelY      = data.yAccel.value[0];
            otherSphero.accelOne    = data.accelOne.value[0];
        }

        // --- Signal to interested parties
        // SE.emit( "sphero-data-streaming", JSON.stringify({ "spheroIndex": mySphero.hocIndex , "data": data }) );
    });


    // To detect locator, accelOne and velocity from the sphero, we use setDataStreaming.
    // sphero API data sources for locator info are as follows:
    //      ["locator", "accelOne", "velocity"]
    // It is also possible to pass an opts object to setDataStreaming():
    var opts = {
      // n: int, divisor of the max sampling rate, 400 hz/s     // n = 40 means 400/40 = 10 data samples per second,    // n = 200 means 400/200 = 2 data samples per second
      n: 100,       // 4 per seconds
      // m: int, number of data packets buffered before passing to the stream   // m = 10 means each time you get data it will contain 10 data packets
      // m = 1 is usually best for real time data readings.
      m: 1,
      // pcnt: 1 -255, how many packets to send.    // pcnt = 0 means unlimited data Streaming    // pcnt = 10 means stop after 10 data packets
      pcnt: 0,
      dataSources: ["odometer", "accelOne", "velocity", "accelerometer"]          // FIXME        // locator (issue #55), accelerometer, gyroscope,
    };
    //
    mySphero.setDataStreaming(opts);


    // --- Detect Collisions
    mySphero.on("collision", function() {
        console.log( "CylonRobot [%s] COLLISION", mySphero.name );
        SE.emit( "sphero-collision", JSON.stringify({ "spheroIndex": mySphero.hocIndex }) );
    });
    mySphero.detectCollisions( function(err, data) {
        //console.log( "CylonRobot [%s] detectCollisions error/data:", mySphero.hocIndex );
        //console.log( err || data );
    });


    // --- Battery info
    mySphero.on("powerStateInfo", function(data) {                   // Doc "getPowerState" https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
        console.log( "CylonRobot [%s] powerStateInfo", mySphero.name );
        console.log( data );
        if ( data.batteryState == 0x03 ) {
            SE.emit( "sphero-battery-low", JSON.stringify({ "spheroIndex": mySphero.hocIndex }) );
        } else if ( data.batteryState == 0x04 ) {
            SE.emit( "sphero-battery-critical", JSON.stringify({ "spheroIndex": mySphero.hocIndex }) );
        }
    });
    // Power notifications are async notifications
    mySphero.setPowerNotification( true, function(err, data) {      // sphero asynchronously notifies of power state periodically (every 10 seconds, or immediately when a change occurs)
        //console.log( "CylonRobot [%s] setPowerNotification error/data:", mySphero.hocIndex );
        //console.log( err || data );
    });


    // ----- Generics. Others ???
    /*
    mySphero.on("data", function(data) {
        console.log( "CylonRobot [%s] DATA, with args: ", mySphero.name );
        console.log(data);
    });

    mySphero.on("update", function(data) {
        console.log( "CylonRobot [%s] UPDATE, eventName [%s], with args: ", mySphero.name, data );
        console.log(data);
    });

    mySphero.on("response", function(data) {
        console.log( "CylonRobot [%s] RESPONSE, with args: ", mySphero.name );
        console.log(data);
    });

    mySphero.on("async", function(data) {
        console.log( "CylonRobot [%s] ASYNC, with args: ", mySphero.name );
        console.log(data);
    });
    */

    return;
};


/** */
function _onDisconnect( _this, mySphero, idx )
{
    console.log( "CylonRobot [%s] DISCONNECTED", idx );
    global.currentNumberOfSpherosConnected--;
    SE.emit( "sphero-disconnect", JSON.stringify({ "spheroIndex": idx }) );
    // Reset array values
    _this.spheroCommPorts[ idx ]      = null;      // When not connected, the value is null
    _this.spheroCylonRobots[ idx ]    = null;      // When not connected, the value is null
    // Reset darkSpheroIndex if was the one
    if (_this.darkSpheroIndex == idx) {
        _this.darkSpheroIndex = undefined;
    }
    //
    delete mySphero;
}




/***
CylonSphero.prototype.setColor = function( spheroColor )
{
    console.log( 'CylonSphero setColor [%s] received', spheroColor );
    this.spheroColor    = spheroColor;
    this.sphero.color( spheroColor );
};
***/


/**
 *  Return the content of the ThreadedSpheroUserCodeRun file
 * /
function readTemplateUserCodeRun()
{
    return FS.readFileSync( "./src/sphero/ThreadedSpheroUserCodeRun.js", 'utf8' );
} */


module.exports = CylonSphero;



/*    Examples
------------------------------------------------------------------------------------------------------
http://cylonjs.com/documentation/examples/sphero/
------------------------------------------------------------------------------------------------------
*/
