/**
 *  Command the Sphero via established bluetooth connection on /dev/rfcommX
 *    Use Cylon lib             http://cylonjs.com/
 *    TODO: Use thread library  https://github.com/audreyt/node-webworker-threads
 */

var Cylon = require('cylon');

// Sphero & log events
var SpheroEvents    = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here

// Every time a bluetooth device is found:
//   SE.emit( "bt-device-connected", JSON.stringify({ "macAddress": macAddress, "channel": channel }) );


/**
 *  CylonSphero stores all available Spheros (after testing a ping on them)
 *    and allow Spheros to be controlled by browser code
 *
 *          TODO: creating new thread
 *          TODO: Sphero color
 *          TODO: RPi Network
 */
function CylonSphero()
{
    // class attributes
    this.spheroChannels         = [];
    this.spheroCommPorts        = [];
    this.spheroCylonRobots      = [];
    this.spheroMacAddress2Index = [];       // Associative array. Allows to deduplicate!

    // Closure for on(...)
    var _this = this;

    // When new device detected: SE.emit( "bt-device-connected", JSON.stringify({ "macAddress": macAddress, "channel": channel }) );
    SE.on( "bt-device-connected", function(deviceDescription) {
        onBluetoothDeviceConnected( _this, deviceDescription );
    });

    // --- Start Cylon: global to all spheros!
    Cylon.start();
    return;
}

/***
    spheroIndex = Number(spheroIndex);
    if ( spheroIndex < 0 || spheroIndex > 9 ) {
        throw new Error('Wrong spheroIndex in CylonSphero');
    }

    this.spheroIndex    = spheroIndex;
    this.commPort       = "/dev/rfcomm" + spheroIndex;
    this.spheroColor    = spheroColor;

    this.cylonRobot     = Cylon.robot({ name: 'Sphero-'+spheroIndex })
                            .connection( 'sphero', { adaptor: 'sphero', port: this.commPort })
                            .device('sphero', { driver: 'sphero' })
                            .on( 'error', console.log )
                            .on( 'ready', function(my) {} );            // FIXME: Color + TAIL !!!!!
***/




/**
 *  SE.on( "bt-device-connected", ...)
 */
function onBluetoothDeviceConnected( _this, deviceDescription )
{
    try {
        var deviceInfo = JSON.parse( deviceDescription );
        if ( !deviceInfo.channel ) {
            console.error("ERROR in CylonSphero onBluetoothDeviceConnected: channel is null for device [%s]", deviceDescription.macAddress);
            return;
        }

        // FIXME: What is the channel format ????
        console.log("Channel object is:");
        console.log( deviceInfo.channel );

        // FIXME: Check whether we already have a record for this macAddress !!!!!!
        //      In this case, no need to recreate !!!!!

        // --- Create the corresponding Cylon.robot
        var idx = _this.spheroChannels.length;
        var commPort = "/dev/rfcomm" + deviceInfo.channel;                        // FIXME

        var cylonRobot = Cylon.robot({ name: 'Sphero-' + idx })
                .connection( 'sphero', { adaptor: 'sphero', port: commPort })
                .device('sphero', { driver: 'sphero' })
                .on( 'error', console.warn );
        console.log("CylonRobot created with index ["+ idx+"], but is it a Sphero? Test it!");

        // --- Test it is a Sphero
        cylonRobot.on( 'ready', function(my) {
            console.log("CylonRobot ["+ my.sphero.name+"], ready, start a ping to check whether it is a Sphero");
            var _my     = my;                       // Closure
            var _deviceInfo = deviceInfo;           // Closure
            var __this  = _this;                    // Closure
            // Ping and wait async. If does not return at this point and end up with an error,
            //      then we will need to restart Node to connect to that Sphero...      // FIXME: setInterval for btSerial.inquire ??? Then must deduplicate!
            my.sphero.ping( function() {
                console.log("CylonRobot ["+ _my.sphero.name+"], ok, it is a Sphero!!");
                var cylonRobot  = _my;
                var _this       = __this;
                var deviceInfo  = _deviceInfo;

                // --- Ok, we can finalize Sphero initialization

                // Init the cylonRobot with all eventListeners + initialization code (startCalibration)  // ?? FIXME ??
                initCylonRobot( _this, cylonRobot );

                // --- Now we know it is a Sphero, save info as class attributes for this Sphero
                _this.spheroChannels.push( deviceInfo.channel );
                _this.spheroCommPorts.push( commPort );
                _this.spheroCylonRobots.push( cylonRobot );
                _this.spheroMacAddress2Index[ deviceInfo.macAddress ] = _this.spheroCylonRobots.length - 1;

                // Test // FIXME
                var sph = cylonRobot.sphero;
                //
                sph.roll(60, 0);
                // sph.startCalibration();
            });
        });

        // Sphero color ????
        // FIXME

    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in CylonSphero onBluetoothDeviceConnected: " + exc.stack + "\n" ); }
    return;
}



/**
 *  Init the Cylon Robot object with collision, data-streaming, ...     // FIXME
 */
function initCylonRobot( _this, cylonRobot );
{
    console.log( 'initCylonRobot' );

    // FIXME
};





CylonSphero.prototype.setColor = function( spheroColor )
{
    console.log( 'CylonSphero setColor [%s] received', spheroColor );
    this.spheroColor    = spheroColor;
    // FIXME ;
    this.sphero.color( spheroColor );
};



/*********************************
    Examples
------------------------------------------------------------------------------------------------------
http://cylonjs.com/documentation/examples/sphero/fluent/locator/
------------------------------------------------------------------------------------------------------


.on("ready", function(bot) {
   var color = 0x00FF00,
   bitFilter = 0xFFFF00;

   console.log("Setting up Collision Detection...");

   bot.sphero.on("dataStreaming", function(data) {
     console.log("data:");
     console.log(data);
   });

   bot.sphero.on("collision", function() {
     console.log("Collision:");
     color = color ^ bitFilter;
     console.log("Color: " + (color.toString(16)) + " ");
     bot.sphero.color(color);
     bot.sphero.roll(128, Math.floor(Math.random() * 360));
   });

   bot.sphero.detectCollisions();
   // To detect locator, accelOne and velocity from the sphero
   // we use setDataStreaming.
   // sphero API data sources for locator info are as follows:
   // ["locator", "accelOne", "velocity"]
   // It is also possible to pass an opts object to setDataStreaming():
   var opts = {
     // n: int, divisor of the max sampling rate, 400 hz/s
     // n = 40 means 400/40 = 10 data samples per second,
     // n = 200 means 400/200 = 2 data samples per second
     n: 200,
     // m: int, number of data packets buffered before passing to the stream
     // m = 10 means each time you get data it will contain 10 data packets
     // m = 1 is usually best for real time data readings.
     m: 1,
     // pcnt: 1 -255, how many packets to send.
     // pcnt = 0 means unlimited data Streaming
     // pcnt = 10 means stop after 10 data packets
     pcnt: 0,
     dataSources: ["locator", "accelOne", "velocity"]
   };

   bot.sphero.setDataStreaming(opts);

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


------------------------------------------------------------------------------------------------------
http://cylonjs.com/documentation/examples/sphero/fluent/collision/
------------------------------------------------------------------------------------------------------


.on("ready", function(bot) {
   var color = 0x00FF00,
       bitFilter = 0xFFFF00;

   console.log("Setting up Collision Detection...");

   bot.sphero.on("collision", function() {
     console.log("Collision:");
     color = color ^ bitFilter;
     console.log("Color: " + (color.toString(16)) + " ");
     bot.sphero.color(color);
     bot.sphero.roll(90, Math.floor(Math.random() * 360));
   });

   bot.sphero.color(color);
   bot.sphero.detectCollisions();
 });


*/
