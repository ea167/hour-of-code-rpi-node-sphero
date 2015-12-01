var Cylon = require('cylon');


/** -----------------------------------------------------
 *  CylonSphero groups essential interfaces to make the Sphero move
 *  @arg spheroIndex from 0 (typically 0 or 1)
 *  @arg spheroColor rgb hex, eg: 0x00FF00
 */
function CylonSphero( spheroIndex, spheroColor )
{
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

    /// this.cylonRobot.start();
}


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
