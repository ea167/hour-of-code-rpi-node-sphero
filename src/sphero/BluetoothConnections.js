/**
 *  Start Bluetooth connections when Node.js starts, and emit an SpheroEvent for each
 *      to create Cylon robots on each one found as Sphero
 */

// To exec 'sudo rfcomm connect rfcommX {macAddress}'
var childProcess = require('child_process');

// Use https://www.npmjs.com/package/bluetooth-serial-port
var bluetoothSerialPort = require('bluetooth-serial-port');

// Sphero & log events
var SpheroEvents    = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here



function BluetoothConnections()
{
    var btSerial    = new bluetoothSerialPort.BluetoothSerialPort();
    var rfcommIndex = 1;    // Starts at 1 to avoid collisions
    var childProcs  = [];

    btSerial.on('found', function(macAddress, name) {
        // --- Any bluetooth device found. Orbotix, Inc. OUI (macAddress Prefix) is 68:86:E7
        console.log( "Bluetooth device found: name [%s] at macAddress [%s]", name, macAddress );     // But not only paired!
        if ( !macAddress || !macAddress.toString().toUpperCase().startsWith("68:86:E7")) {
            console.log( "   Bt device NOT a Sphero! Ignoring macAddress [%s]", macAddress );
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
                if (error !== null) {
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
    function btSerialInquire() {
        if (isInquiring) {
            console.warn( "btSerialInquire already/still inquiring!" );
            return;
        }
        isInquiring = true;
        btSerial.inquire();
    }
    // Right now
    btSerialInquire();

    // And then repeatedly every 30 seconds
    var intervalId = setInterval( btSerialInquire, 30000 );


    // --- If we need to close the connections. Warning: in the module code, it looks that close() may take a macAddress as argument
    SE.on( "bt-close", function () {
        console.log('===== Bluetooth Serial CLOSED =====');
        btSerial.close();
    });

}


module.exports = BluetoothConnections;
