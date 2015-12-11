/**
 *  Start Bluetooth connections when Node.js starts, and emit an SpheroEvent for each
 *      to create Cylon robots on each one found as Sphero
 *
 *  The RPi will try to connect aggressively to new Spheros until it has reached
 *
 *  ENV:    Environment variables that may optionally be defined to alter Bluetooth connection startegy
 *
 *      // Color of the RPi, which in turn implies the color of the Spheros
 *      HOC_COLOR="purple"              // [red,green,blue,yellow,purple]
 *
 *      // Will try to connect aggressively until reaching this number of Spheros connected
 *      HOC_EAGER_SPHERO_MAX_COUNT="2"
 *
 *      // List of Sphero Mac addresses NOT to connect to, separated by commas
 *      HOC_FORBIDDEN_SPHERO_MACADDRS="68:86:E7:04:BC:EA,68:86:E7:04:CF:8F"
 *
 *      // To bypass Bluetooth discovery and directly connect to Serial ports.
 *      // Use this on Apple MACs: (ls /dev/tty.Sphero*) see http://cylonjs.com/documentation/platforms/sphero/
 *      HOC_DIRECT_SERIAL_PORTS="/dev/tty.Sphero-BBP-AMP-SPP,/dev/tty.Sphero-BBP-AMP-SQQ"
 *
 */

 ///
 //  NOTICE: the user running node.js must be able to exec "sudo rfcomm" to connect to Sphero
 //
 //  Here is defined a limit of number of Spheros to connect, useful when you have several Raspberry Pis
 //      Feel free to put this limit very high if you want to connect more Spheros to a single RPi
 ///
 global.EAGER_SPHERO_MAX_COUNT    = Number( process.env.HOC_EAGER_SPHERO_MAX_COUNT) || 2;   // Note: (NaN) false, (!NaN) true



// To exec 'sudo rfcomm connect rfcommX {macAddress}'
var childProcess = require('child_process');

// We do not use https://www.npmjs.com/package/bluetooth-serial-port anymore
//    as it blocks the main thread for several seconds while doing inquire()
// var bluetoothSerialPort = require('bluetooth-serial-port');

// Sphero & log events
var SpheroEvents    = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here



function BluetoothConnections()
{
    var rfcommIndex = 1;    // Starts at 1 to avoid collisions
    var childProcs  = [];
    global.currentNumberOfSpherosConnected = 0;         // To enforce limit of global.MAX_NUMBER_OF_SPHEROS

    btSerial.on('found', function(macAddress, name) {

        // --- Any bluetooth device found. Orbotix, Inc. OUI (macAddress Prefix) is 68:86:E7
        console.log( "Bluetooth device found: name [%s] at macAddress [%s]", name, macAddress );     // But not only paired!
        if ( !macAddress || !macAddress.toString().toUpperCase().startsWith("68:86:E7")) {
            console.log( "   Bt device NOT a Sphero! Ignoring macAddress [%s]", macAddress );
            return;
        }

        // --- No more than global.MAX_NUMBER_OF_SPHEROS
        if ( global.currentNumberOfSpherosConnected >= global.MAX_NUMBER_OF_SPHEROS ) {
            console.warn( "Soft MAX number of Spheros [%s / %s] REACHED, Ignoring macAddress [%s]",
                global.currentNumberOfSpherosConnected, global.MAX_NUMBER_OF_SPHEROS, macAddress );
            return;
        }

        // --- Connect to the Sphero through exec 'sudo rfcomm ...'
        //      Exec 'sudo rfcomm connect rfcommX {macAddress}'
        var rfcommDev   = "/dev/rfcomm" + rfcommIndex;
        var cmdExec     = "sudo rfcomm connect rfcomm"+ rfcommIndex +" "+ macAddress;
        rfcommIndex     = (1 + rfcommIndex) & 63;           // Limit the value to 63 and loop otherwise (if conflict, will fail and retry)
        var cmdOk       = true;

        childProcs.push( childProcess.exec( cmdExec,
            function (error, stdout, stderr) {
                console.log('Exec rfcomm stdout: ' + stdout);
                console.warn('Exec rfcomm stderr: ' + stderr);
                if (error) {
                    cmdOk = false;
                    console.error('Exec rfcomm ERROR: ' + error);
                }
        }) );

        // --- Delay by 7s so we roughly know whether Rpi has successfully CONNECTED to this Sphero
        setTimeout( function() {
            if ( !cmdOk ) {
                console.log( "Bluetooth Sphero connection FAILED for macAddress [%s] with rfcommDev [%s]. Recycling.\n", macAddress, rfcommDev );
                return;
            }

            global.currentNumberOfSpherosConnected++;
            console.log( "Bluetooth device macAddress [%s] with rfcommDev [%s] CONNECTED\n", macAddress, rfcommDev );
            SE.emit("node-user-log", "Bluetooth device macAddress ["+ macAddress +"] with rfcommDev ["+ rfcommDev +"] CONNECTED");

            // Signal so that CylonSphero (and others) can use this channel. They will have to check that it is actually a Sphero!
            SE.emit( "bt-device-connected", JSON.stringify({ "macAddress": macAddress, "rfcommDev": rfcommDev }) );
        }, 7000 );

    }); // end of btSerial.on('found',...)


/***
    /dev/rfcommX not created by default on RPi => connection problems.
    => Workaround through exec rfcomm

        // @param channel is a number
        btSerial.findSerialPortChannel( macAddress, function(channel) {

            // TODO: What happens with Spheros that are not paired ???

            // Success callback when serial port found for this device. Otherwise just ignore!
            console.log( "Bluetooth device macAddress [%s] has port channel [%s] \n  Trying to connect...", macAddress, channel );
            btSerial.connect( macAddress, channel, function() {

                // --- Success callback when CONNECTED to this device
                console.log( "Bluetooth device macAddress [%s] with port channel [%s] CONNECTED\n", macAddress, channel );
                SE.emit("node-user-log", "Bluetooth device macAddress ["+ macAddress +"] with port channel ["+ channel +"] CONNECTED");

                // Signal so that CylonSphero (and others) can use this channel. They will have to check that it is actually a Sphero!
                SE.emit( "bt-device-connected", JSON.stringify({ "macAddress": macAddress, "channel": channel }) );
                return;
                / **
                    // Here we could send data, and hook to receive data
                    btSerial.write(new Buffer('my data', 'utf-8'), function(err, bytesWritten) {
                        if (err) console.log(err);
                    });
                    btSerial.on('data', function(buffer) {
                        console.log(buffer.toString('utf-8'));
                    });
                ** /
            },
            // --- Error callback when connection failed for this device
            function () {
                console.log( "Bluetooth device connection FAILED for macAddress [%s] with port channel [%s]. Ignoring!\n", macAddress, channel );
            });
        },
        // --- Error callback when no serial ports found for this device
        function() {
            console.log( "Bluetooth device macAddress [%s] has NO port channel. Ignoring!\n", macAddress );
        });
    }); // end of btSerial.on('found',...)
***/


    // --- INQUIRE repeatedly
    var isInquiring = false;

    btSerial.on('finished', function () {
        console.log('------- Bluetooth Serial INQUIRE finished -------');
        isInquiring = false;
    });

    // --- Start the bluetooth scanning!
    function btSerialInquire()
    {
        if ( global.currentNumberOfSpherosConnected >= global.MAX_NUMBER_OF_SPHEROS ) {
            console.info( "Max number of Spheros [%s / %s] REACHED, skipping btSerialInquire",
                global.currentNumberOfSpherosConnected, global.MAX_NUMBER_OF_SPHEROS );
            return;
        }
        if (isInquiring) {
            console.warn( "btSerialInquire already/still inquiring!" );
            return;
        }
        if ( global.cylonSphero.isCodeRunning() ) {
            console.info( "Code is currently running, so skipping btSerialInquire" );
            return;
        } else {
            console.info( "NO running Code, call btSerialInquire" );
        }
        isInquiring = true;
        btSerial.inquire();
    }
    // Right now
    btSerialInquire();

    // And then repeatedly every 20 seconds
    var intervalId = setInterval( btSerialInquire, 20000 );


    // --- If we need to close the connections. Warning: in the module code, it looks that close() may take a macAddress as argument
    SE.on( "bt-close", function () {
        console.log('===== Bluetooth Serial CLOSED =====');
        btSerial.close();
    });

}


module.exports = BluetoothConnections;
