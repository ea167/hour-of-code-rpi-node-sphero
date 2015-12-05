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
    // Bluetooth and Sphero (class attributes)
    this.spheroCommPorts        = [];   // When not connected, the value is null
    this.spheroMacAddresses     = [];
    this.spheroCylonRobots      = [];   // When not connected, the value is null. WARNING: mySphero == spheroCylonRobots[].sphero
    this.spheroMacAddress2Index = [];   // Associative array to reuse the same index in case of disconnection. Note: inquire() does not return the ones already connected

    // Running code:
    this.spheroUserCodeRuns     = [];
    this.isCodeRunning          = function() {
        for( var i=0; i < this.spheroUserCodeRuns.length; i++ ) {
            if ( this.spheroUserCodeRuns[i] && this.spheroUserCodeRuns[i]._endLoop === false )
                return true;
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
        var userInfo = JSON.parse( userDescription );
        if ( typeof userInfo.spheroIndex === "undefined" || !userInfo.userCode ) {
            console.error("ERROR in CylonSphero onUserCodePushed: spheroIndex/userCode is null for [%s]", userInfo.spheroIndex);
            return;
        }
        var spheroIndex = userInfo.spheroIndex;

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
        var userInfo = JSON.parse( userDescription );
        if ( typeof userInfo.spheroIndex === "undefined" ) {
            console.error("ERROR in CylonSphero onUserStop: spheroIndex is null");
            return;
        }
        var spheroIndex = userInfo.spheroIndex;

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
function _finalSpheroStop( _this, mySphero )
{
    var spheroIndex = mySphero.hocIndex;
    console.log( "\nCylonRobot [%s] stopping", spheroIndex );
    _this.spheroUserCodeRuns[spheroIndex].sandbox._endLoop = true;

    mySphero.stop();

    // FIXME: RESET Sphero color !!!!

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

                    // Init the cylonRobot with all eventListeners + initialization code (show tail Led)
                    initCylonRobot( _this, my.sphero );

                    // Test // FIXME
                    my.sphero.color( 0x00FF00 );
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


        // Test FIXME
        //setTimeout( function(){ cylonRobot.sphero.color( 0xFF00FF ); }, 5000 );

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
 *  Init the Cylon Robot object with collision, data-streaming, ...     // FIXME
 */
function initCylonRobot( _this, mySphero )
{
    console.log( "CylonRobot [%s] initialization\n", mySphero.hocIndex );

    // --- AutoReconnect & InactivityTimeout
    mySphero.setAutoReconnect( 1, 20, function(err, data) {         // 1 for yes, 20 sec, cb    // Doc https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
        console.log( "CylonRobot [%s] AutoReconnect error/data:", mySphero.hocIndex );
        //console.log( err || data );
    });
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
        //console.log( "CylonRobot [%s] DATA-STREAMING data:", mySphero.hocIndex );
        //console.log(data);
        SE.emit( "sphero-data-streaming", JSON.stringify({ "spheroIndex": mySphero.hocIndex , "data": data }) );
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
      dataSources: ["odometer", "accelOne", "velocity", "accelerometer", "gyroscope"]          // FIXME        // locator (issue #55), accelerometer, gyroscope,
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
