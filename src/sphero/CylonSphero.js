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

// Threads lib from  https://www.npmjs.com/package/webworker-threads
var Threads = require('webworker-threads');
var FS      = require('fs');

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

    // Threads to run user code
    this.spheroUserCodeThreads  = [];
    this.templateUserCodeRun    = readTemplateUserCodeRun();

    // Closure for on(...)
    var _this = this;

    // --- When new device detected
    SE.on( "bt-device-connected", function(deviceDescription) {
        onBluetoothDeviceConnected( _this, deviceDescription );
    });

    // --- When user code pushed!
    SE.on( "push-code", function( userDescription ) {
        onUserCodePushed( _this, userDescription );      // spheroIndex, userCode
    });

    // --- When user stop clicked!
    SE.on( "stop-code", function( userDescription ) {
        onUserStop( _this, userDescription );               // spheroIndex
    });

    return;
}



// TODO: onSpheroStop : kill thread + startCalibration()




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

        // --- Existing Thread?
        var thread = _this.spheroUserCodeThreads[ spheroIndex ];
        if (thread) {
            thread.destroy();               // Terminate the thread when needed!
        }
        thread = Threads.create();
        _this.spheroUserCodeThreads[ spheroIndex ] = thread;

        // --- Eval and execute ThreadedSpheroUserCodeRun in this thread
        var mySphero    = _this.spheroCylonRobots[ spheroIndex ].sphero;
        var codeToRun   = " var mySphero = JSON.parse('"+ JSON.stringify( mySphero ) +"'); \n"
                        + " var userCode = JSON.parse('"+ JSON.stringify( userInfo.userCode ) +"'); \n";
        codeToRun += _this.templateUserCodeRun;
        //
        thread.eval( codeToRun, function(err, completionValue) {        // Doc https://github.com/audreyt/node-webworker-threads
            console.log( "CylonRobot [%s] EVAL USER-CODE completed with error/completionValue -- Stops", spheroIndex );
            console.log( err || completionValue );
            // Final STOP when thread ends
            _finalSpheroStop( _this, mySphero );
        });
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

        // --- Existing Thread?
        var thread = _this.spheroUserCodeThreads[ spheroIndex ];
        if (thread) {
            thread.destroy();               // Terminate the thread when needed!
        }
        _this.spheroUserCodeThreads[ spheroIndex ] = null;

        // --- Stop Sphero and startCalibration
        _finalSpheroStop( _this, _this.spheroCylonRobots[ spheroIndex ].sphero );
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onUserStop: " + exc.stack + "\n" ); }
    return;
}

/** Private function for onUserStop & onUserCodePushed */
function _finalSpheroStop( _this, mySphero )
{
    mySphero.stop();

    // FIXME: RESET Sphero color !!!!

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
                    console.log("CylonRobot ["+ my.sphero.name+"] ready, start some calibration/rolling!");

                    // Store its index inside the object. Before initCylonRobot called!
                    my.sphero.hocIndex = idx;

                    // Init the cylonRobot with all eventListeners + initialization code (startCalibration)
                    initCylonRobot( _this, my.sphero );

                    // Test // FIXME
                    my.sphero.color( 0x00FF00 );

                    // Ping every 10s to keep the connection open
                    setInterval( function(){ my.sphero.ping(); }, 10000 );

                    // startCalibration to show tail and backLed !!!
                    my.sphero.startCalibration();    // Shown also again everytime the user clicks stop!


                    /*
                    eval( "function testNothing() { my.sphero.startCalibration(); } " );
                    eval( "function testNothing() { my.sphero.color( 0xFF0000 ); } " );
                    every((1).second(), function() {
                        my.sphero.roll(60, Math.floor(Math.random() * 360));
                    });
                    testNothing();
                    */
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
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onBluetoothDeviceConnected: " + exc.stack + "\n" ); }
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
        console.log( err || data );
    });
    mySphero.setInactivityTimeout( 1800, function(err, data) {      // 30 minutes, cb    // Doc https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
        console.log( "CylonRobot [%s] InactivityTimeout error/data:", mySphero.hocIndex );
        console.log( err || data );
    });
    mySphero.stopOnDisconnect( true, function(err, data) {
        console.log( "CylonRobot [%s] stopOnDisconnect error/data:", mySphero.hocIndex );
        console.log( err || data );
    });
    mySphero.on( "disconnect", function() {
        console.log( "CylonRobot [%s] DISCONNECTED", mySphero.hocIndex );
        global.currentNumberOfSpherosConnected--;
        SE.emit( "sphero-disconnect", JSON.stringify({ "spheroIndex": mySphero.hocIndex }) );
        // Reset array values
        _this.spheroCommPorts[ mySphero.hocIndex ]      = null;      // When not connected, the value is null
        _this.spheroCylonRobots[ mySphero.hocIndex ]    = null;      // When not connected, the value is null
        // delete this; ???
    });

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
      n: 40,
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
        console.log( "CylonRobot [%s] detectCollisions error/data:", mySphero.hocIndex );
        console.log( err || data );
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
        console.log( "CylonRobot [%s] setPowerNotification error/data:", mySphero.hocIndex );
        console.log( err || data );
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
 */
function readTemplateUserCodeRun()
{
    return FS.readFileSync( "./src/sphero/ThreadedSpheroUserCodeRun.js", 'utf8' );
}


module.exports = CylonSphero;







/*********************************


------------------------------------------------------------------------------------------------------
    Examples
------------------------------------------------------------------------------------------------------
http://cylonjs.com/documentation/examples/sphero/fluent/locator/
------------------------------------------------------------------------------------------------------


.on("ready", function(bot) {
   var color = 0x00FF00,
   bitFilter = 0xFFFF00;


   // SetBackLED turns on the tail LED of the sphero that helps
   // identify the direction the sphero is heading.
   // accepts a param with a value from 0 to 255, led brightness.
   bot.sphero.setBackLed(192);
   bot.sphero.color(color);
 });


------------------------------------------------------------------------------------------------------

  work: function(my) {
    var max = 0;
    var changingColor = false;

    my.sphero.setDataStreaming(["velocity"], { n: 40, m: 1, pcnt: 0 });
    my.sphero.on("data", function(data) {
      if (!changingColor) {
        var x = Math.abs(data[0]),
            y = Math.abs(data[1]);

        if (x > max) {
          max = x;
        }

        if (y > max) {
          max = y;
        }
      }
    });

    every((0.6).second(), function() {
      changingColor = true;

      if (max < 10) {
        my.sphero.setColor("white");
      } else if (max < 100) {
        my.sphero.setColor("lightyellow");
      } else if (max < 150) {
        my.sphero.setColor("yellow");
      } else if (max < 250) {
        my.sphero.setColor("orange");
      } else if (max < 350) {
        my.sphero.setColor("orangered");
      } else if (max < 450) {
        my.sphero.setColor("red");
      } else {
        my.sphero.setColor("darkred");
      }

      max = 0;
      changingColor = false;
    });

  }


*/
