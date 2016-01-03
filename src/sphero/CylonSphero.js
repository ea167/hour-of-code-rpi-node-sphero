/**
 *  Command the Sphero via established bluetooth connection on /dev/rfcommX
 *    Use Cylon lib             http://cylonjs.com/
 *
 *  Refactored to run in a separate thread dedicated to one Sphero only
 */

var Cylon = require('cylon');
global.Cylon = global.Cylon || Cylon;       // To simplify in the callbacks and avoid closures

// Sphero & log events
var SpheroEvents    = require('./SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here


// -----------------------------------------------------------------------------
// global.STARTING_POS_Y_CORRECTION = 20; // FIXME

// FIXME: SpheroConnectionManager childProc onMessage() de tous les process.send( JSON.stringify({ "action":"...", "macAddress":_this.macAddress


/**
 *  For ONE Sphero, in a separate process forked
 */
function CylonSphero()
{
    this.port       = process.argv[2];
    this.macAddress = process.argv[3];
    this.name       = process.argv[4];
    this.color      = process.argv[5];
    //
    this.posYCorrection = ( isNaN(process.argv[6]) ? 0 : Number(process.argv[6]) );
    //
    this.cylonRobot         = null;
    this.mySphero           = null;
    this.spheroUserCodeRuns = null;
    //
    this.others             = {};       // Map  Key = Other Sphero Name, Value = Object with properties .name, .color, .posX, .posY, etc.

    console.log("\nINFO in NEW CylonSphero: port, macAddress, name, color are:");
    console.log( this.port );
    console.log( this.macAddress );
    console.log( this.name );
    console.log( this.color );


/*
    // Running code:
    this.spheroUserCodeRuns     = [];
    this.isCodeRunning          = function() {
        for( var i=0; i < this.spheroUserCodeRuns.length; i++ ) {
            if ( this.spheroUserCodeRuns[i] && this.spheroUserCodeRuns[i].sandbox._endLoop === false )
            { return true; }
        }
        return false;
    };
*/

    // Closure for on(...)
    var _this = this;

    // --- onMessage    JSON.stringify( {action:, ...} )
    process.on( 'message', function(msg) {
        var dataObj = JSON.parse( msg );
        switch (dataObj.action) {
            // --- When user code pushed!
            case "push-code":
                _this.onUserCodePushed( dataObj.userCode );
                break;

            // --- When user click stop!
            case "stop-code":
                _this.onUserStop();
                break;

            // --- Save position, speed and acceleration of ANOTHER Sphero here
            case "other-sphero":
                var os = dataObj.otherSphero;
                if (os && os.name) {
                    _this.mySphero.otherTimestamp   = os.timestamp;
                    _this.mySphero.otherPosX        = os.posX;
                    _this.mySphero.otherPosY        = os.posY;
                    _this.mySphero.otherSpeedX      = os.speedX;
                    _this.mySphero.otherSpeedY      = os.speedY;
                    _this.mySphero.otherAccelX      = os.accelX;
                    _this.mySphero.otherAccelY      = os.accelY;
                    _this.mySphero.otherAccelOne    = os.accelOne;
                    // Store also by name
                    this.others[os.name] = os;
                    //
                    console.log("DEBUG Sphero[%s] \t posX=%s \t posY=%s", os.name, os.posX, os.posY);
                }
                break;

            default:
                console.error( "\nERROR in CylonSphero.on.MESSAGE, msg is:" );
                console.error( msg );
                return;
        }
        return;
    });

    // --- Create the CylonSphero and init it. Will be added:
    //      this.mySphero           = my.sphero;
    //      this.cylonRobot         the full cylonRobot object
    this.createCylonSphero();
    return;
}



/**
 *  .on( "push-code", ...)
 *
 *  Set this.spheroUserCodeRuns
 */
CylonSphero.prototype.onUserCodePushed  =  function( userCode )
{
    try {
        if ( !userCode ) {
            console.error("ERROR in CylonSphero onUserCodePushed: userCode is null for Sphero=[%s], macAddress=[%s]", this.name, this.macAddress);
            return;
        }

        // --- Check that Sphero still connected
        if ( !this.mySphero || !this.cylonRobot ) {
            console.error("ERROR in CylonSphero onUserCodePushed: sphero DISCONNECTED Sphero=[%s], macAddress=[%s]", this.name, this.macAddress);
            this._onDisconnect();
            return;
        }

        // --- Require version, same thread
        var SpheroUserCodeRun = require("./RequireSpheroUserCodeRun");
        console.log( "\nCylonRobot [%s] REQUIRE USER-CODE completed -- run SpheroUserCodeRun NOW", this.name );
        this.spheroUserCodeRuns = new SpheroUserCodeRun( this.mySphero, userCode );                              // ,SE FIXME
        console.log( "\nCylonRobot [%s] SpheroUserCodeRun returned. Do not stop now, as setInterval keeps on!", this.name );
        // this._finalSpheroStop();
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onUserCodePushed: " + exc.stack + "\n" ); }
    return;
}



/**
 *  .on( "user-stop", ...)
 */
CylonSphero.prototype.onUserStop  =  function()
{
    try {
        // --- Check that Sphero still connected
        if ( !this.mySphero || !this.cylonRobot ) {
            console.error("ERROR in CylonSphero onUserStop: sphero DISCONNECTED Sphero=[%s], macAddress=[%s]", this.name, this.macAddress);
            this._onDisconnect();
            return;
        }

        // --- Stop Sphero and show tail Led
        this._finalSpheroStop();
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onUserStop: " + exc.stack + "\n" ); }
    return;
}



/** Private function for onUserStop & onUserCodePushed */
CylonSphero.prototype._finalSpheroStop  =  function()
{
    if ( !this.mySphero || !this.cylonRobot || !this.spheroUserCodeRuns ) {
        console.error("ERROR in CylonSphero _finalSpheroStop: sphero DISCONNECTED? Sphero=[%s], macAddress=[%s]", this.name, this.macAddress);
        this._onDisconnect();
        return;
    }

    console.log( "\nCylonRobot [%s] stopping", this.name );
    this.spheroUserCodeRuns.markLoopToEnd();               // sandbox._endLoop = true;

    this.mySphero.stop();

    // RESET Sphero color!
    this.mySphero.color( this.color );

    this.mySphero.setBackLed( 255 );
    this.mySphero.startCalibration();
    return;
}




/**
 *
 */
CylonSphero.prototype.createCylonSphero  =  function()
{
    try {
        if ( !this.port || !this.macAddress ) {
            console.error("ERROR in CylonSphero createCylonSphero: NULL PARAM port=[%s], macAddress=[%s]", this.port, this.macAddress);
            return;
        }

        var _this = this;
        this.cylonRobot = global.Cylon.robot({ name: this.name })                   // { name: ('Sphero-' + idx) }
                .connection( 'sphero', { adaptor: 'sphero', port: this.port })
                .device('sphero', { driver: 'sphero' })
                .on( 'error', console.warn )
                .on( 'ready', function(my) {
                    console.log("DEBUG CylonRobot ["+ my.sphero.name+"] ready, start last initializations!");
                    _this.mySphero = my.sphero;

                    // Init the cylonRobot with all eventListeners + initialization code (show tail Led)
                    _this.initCylonRobot();

                    _this.mySphero.color( _this.color );
                    // _this.mySphero.roll( 20, 0 );
                    // Show tail Led! And block gyroscope!
                    // _this.mySphero.setBackLed( 255 );
                    _this.mySphero.startCalibration();

                    // Ping every 10s to keep the connection open
                    // setInterval( function(){ _this.mySphero.ping(); }, 10000 );
                });

        // --- Start Cylon: only for this thread and this Sphero!
        global.Cylon.start();
        // global.Cylon.start();       // When called a second time, IT WORKS, with just the error "Serialport not open" (as already open)
    }
    catch (exc) {
        console.error( "\nTRY-CATCH ERROR in CylonSphero.createCylonSphero: " + exc.stack + "\n" );
        if (exc && exc.stack && exc.stack.indexOf("Serialport not open") >=0 ) {
            this._onDisconnect();
        }
    }
    return;
}



/**
 *  Init the Cylon Robot object with collision, data-streaming, ...
 */
CylonSphero.prototype.initCylonRobot  =  function()
{
    console.log( "CylonRobot [%s] initialization\n", this.name );
    var _this = this;

    // --- AutoReconnect & InactivityTimeout
    // this.mySphero.setAutoReconnect( 1, 20, function(err, data) {         // 1 for yes, 20 sec, cb    // Doc https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
    //    console.log( "CylonRobot [%s] AutoReconnect error/data:", _this.name );
    //    //console.log( err || data );
    //});
    this.mySphero.setInactivityTimeout( 1800, function(err, data) {      // 30 minutes, cb    // Doc https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
        console.log( "CylonRobot [%s] InactivityTimeout error/data", _this.name );
        //console.log( err || data );
    });
    this.mySphero.stopOnDisconnect( true, function(err, data) {
        console.log( "CylonRobot [%s] stopOnDisconnect error/data", _this.name );
        //console.log( err || data );
    });
    this.mySphero.on( "disconnect", function() { _this._onDisconnect(); });

    // --- Data streaming
    this.mySphero.on( "dataStreaming", function(data) {
        var timestamp = Date.now();
        //console.log( "CylonRobot [%s] DATA-STREAMING data:", _this.name );
        //console.log(data);

        // --- Set position, speed and acceleration here!
        _this.mySphero.timestamp  = timestamp;
        _this.mySphero.posX       = data.xOdometer.value[0];
        _this.mySphero.posY       = data.yOdometer.value[0] + _this.posYCorrection;
        _this.mySphero.speedX     = data.xVelocity.value[0];
        _this.mySphero.speedY     = data.yVelocity.value[0];
        _this.mySphero.accelX     = data.xAccel.value[0];
        _this.mySphero.accelY     = data.yAccel.value[0];
        _this.mySphero.accelOne   = data.accelOne.value[0];

        // FIXME !!!
        global.DEBUG_COUNT = global.DEBUG_COUNT || 0;
        if ( global.DEBUG_COUNT < 1 ) {
            console.log( "CylonRobot [%s] DATA-STREAMING mySphero:", _this.name );
            console.log( _this.mySphero );
            console.log("\n\n");
            global.DEBUG_COUNT++;

        process.send( JSON.stringify({ "action":"data-streaming", "macAddress":_this.macAddress, "mySphero":_this.mySphero }) );
    }// FIXME

    });


    // To detect locator, accelOne and velocity from the sphero, we use setDataStreaming.
    // sphero API data sources for locator info are as follows:
    //      ["locator", "accelOne", "velocity"]
    // It is also possible to pass an opts object to setDataStreaming():
    var opts = {
      // n: int, divisor of the max sampling rate, 400 hz/s     // n = 40 means 400/40 = 10 data samples per second,    // n = 200 means 400/200 = 2 data samples per second
//FIXME      n: 100,       // 4 per seconds
      n: 400,       // 1 per seconds
      // m: int, number of data packets buffered before passing to the stream   // m = 10 means each time you get data it will contain 10 data packets
      // m = 1 is usually best for real time data readings.
      m: 1,
      // pcnt: 1 -255, how many packets to send.    // pcnt = 0 means unlimited data Streaming    // pcnt = 10 means stop after 10 data packets
      pcnt: 0,
      dataSources: ["odometer", "accelOne", "velocity", "accelerometer"]          // FIXME        // locator (issue #55), accelerometer, gyroscope,
    };
    //
    this.mySphero.setDataStreaming(opts);


    // --- Detect Collisions
    this.mySphero.on("collision", function() {
        console.log( "CylonRobot [%s] COLLISION ", _this.name );
        process.send( JSON.stringify({ "action":"sphero-collision", "macAddress": _this.macAddress, "name": _this.name }) );

        // TODO: COLORING
    });
    this.mySphero.detectCollisions( function(err, data) {
        //console.log( "CylonRobot [%s] detectCollisions error/data:", _this.name );
        //console.log( err || data );   // FIXME if error
    });


    // --- Battery info
    this.mySphero.on("powerStateInfo", function(data) {                   // Doc "getPowerState" https://github.com/hybridgroup/cylon-sphero/blob/master/lib/commands.js
        console.log( "CylonRobot [%s] powerStateInfo", _this.name );
        console.log( data );
        if ( data.batteryState == 0x03 ) {
            process.send( JSON.stringify({ "action":"sphero-battery-low", "macAddress": _this.macAddress, "name": _this.name }) );
        } else if ( data.batteryState == 0x04 ) {
            process.send( JSON.stringify({ "action":"sphero-battery-critical", "macAddress": _this.macAddress, "name": _this.name }) );
        }
    });
    // Power notifications are async notifications
    this.mySphero.setPowerNotification( true, function(err, data) {      // sphero asynchronously notifies of power state periodically (every 10 seconds, or immediately when a change occurs)
        //console.log( "CylonRobot [%s] setPowerNotification error/data:", _this.name );
        //console.log( err || data );        // FIXME if error
    });


    // ----- Generics. Others ???
    /*
    this.mySphero.on("data", function(data) {
        console.log( "CylonRobot [%s] DATA, with args: ", _this.name );
        console.log(data);
    });

    this.mySphero.on("update", function(data) {
        console.log( "CylonRobot [%s] UPDATE, eventName [%s], with args: ", _this.name, data );
        console.log(data);
    });

    this.mySphero.on("response", function(data) {
        console.log( "CylonRobot [%s] RESPONSE, with args: ", _this.name );
        console.log(data);
    });

    this.mySphero.on("async", function(data) {
        console.log( "CylonRobot [%s] ASYNC, with args: ", _this.name );
        console.log(data);
    });
    */

    return;
};


/** Destroy everything! Typically after a disconnect, this forked process will be terminated and restarted */
CylonSphero.prototype._onDisconnect  =  function()
{
    console.log( "CylonRobot [%s] DISCONNECTED", this.name );
    process.send( JSON.stringify({ "action":"sphero-disconnect", "macAddress":this.macAddress, "name":this.name }) );
    //
    delete this.cylonRobot;
    delete this.mySphero;
}



// --- Lives in a separate process, so only needed for code in that process (not SpheroConnectionManager)
//      new CylonSphero() is what initiates the whole!
//      This ensures it is called only once
global.cylonSphero = global.cylonSphero || new CylonSphero();

module.exports = CylonSphero;



/*    Examples
------------------------------------------------------------------------------------------------------
http://cylonjs.com/documentation/examples/sphero/
------------------------------------------------------------------------------------------------------
*/
// Return the content of the ThreadedSpheroUserCodeRun file
//    return FS.readFileSync( "./src/sphero/ThreadedSpheroUserCodeRun.js", 'utf8' );
