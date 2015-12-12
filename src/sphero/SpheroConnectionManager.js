/**
 *  Start Bluetooth connections when Node.js starts, and emit a SpheroEvent for each,
 *      to create Cylon robots for Sphero found
 *
 *  ENV:    Environment variables that may optionally be defined to alter Bluetooth connection startegy
 *  ====
 *
 *      // Color of the RPi, which in turn implies the color of the Spheros
 *      HOC_COLOR="purple"              // [red,green,blue,yellow,purple]
 *
 *      // The RPi will try to connect aggressively until reaching this number of Spheros connected.
 *      // Default 2, but nothing prevents from having a higher number
 *      HOC_EAGER_SPHERO_MAX_COUNT="2"
 *
 *      // List of Sphero Mac addresses NOT to connect to, separated by commas
 *      HOC_FORBIDDEN_SPHERO_MACADDRS="68:86:E7:04:BC:EA,68:86:E7:04:CF:8F"
 *
 *      // To bypass Bluetooth discovery and directly connect to Serial ports.
 *      // Use this on Apple MACs: (ls /dev/tty.Sphero*) see http://cylonjs.com/documentation/platforms/sphero/
 *      HOC_DIRECT_SERIAL_PORTS="/dev/tty.Sphero-BBP-AMP-SPP,/dev/tty.Sphero-BBP-AMP-SQQ"
 *
 *
 *  NOTICE: the user running Node.js (typically "pi") must be able to exec "sudo rfcomm" to connect to Sphero
 *  ======
 */

// To exec 'sudo rfcomm connect rfcommX {macAddress}'
var childProcess = require('child_process');

// We do not use https://www.npmjs.com/package/bluetooth-serial-port anymore
//    as it blocks the main thread for several seconds while doing inquire()
// var bluetoothSerialPort = require('bluetooth-serial-port');

// Array utils
var ArrayUtils = require("../utils/ArrayUtils");

// Sphero & log events
var SpheroEvents    = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here


/**
 *  Main
 */
function SpheroConnectionManager()
{
    // ----- ENV & Globals

    // RPi Color
    global.RPI_COLOR                = process.env.HOC_COLOR || "purple";

    // Aggressive connection mode until the number of connected Spheros equals this one
    this.EAGER_SPHERO_MAX_COUNT     = Number( process.env.HOC_EAGER_SPHERO_MAX_COUNT) || 2;   // Note: (NaN) false, (!NaN) true

    // Array of Sphero Mac addresses NOT to connect to, separated by commas
    //          HOC_FORBIDDEN_SPHERO_MACADDRS="68:86:E7:04:BC:EA, 68:86:E7:04:CF:8F"
    this.FORBIDDEN_SPHERO_MACADDRS  = [];
    var macAddrs                    = (process.env.HOC_FORBIDDEN_SPHERO_MACADDRS || "").split(',');
    macAddrs.foreach( function( element, index, array ){
        // foreach trim, uppercase, and replace '-' by ':'
        element = element.trim().uppercase().replace(/\-/g,':');
        this.FORBIDDEN_SPHERO_MACADDRS[ this.FORBIDDEN_SPHERO_MACADDRS.length ] = element;
    });

    // To bypass Bluetooth discovery and directly connect to Serial ports.
    //      Use this on Apple MACs: (ls /dev/tty.Sphero*). See http://cylonjs.com/documentation/platforms/sphero/
    //      HOC_DIRECT_SERIAL_PORTS="/dev/tty.Sphero-BBP-AMP-SPP, /dev/tty.Sphero-BBP-AMP-SQQ"
    this.DIRECT_SERIAL_PORTS = [];
    var serlPorts           = (process.env.HOC_DIRECT_SERIAL_PORTS || "").split(',');
    serlPorts.foreach( function( element, index, array ){
        this.DIRECT_SERIAL_PORTS[ this.DIRECT_SERIAL_PORTS.length ] = element.trim();
    });


    // ----- Keeping track of Active and recently Disconnected Spheros
    this.activeSpheros       = [];      // Array of Objects { port: , macAddress: }
    this.disconnectedSpheros = [];
    this.connectingInProcess = [];      // Array of macAddresses of Spheros getting connected (between inquire and connect)


        // TODO: SE.on( "disconnected", ... eagerness back ??? )
    // If a Sphero gets disconnected, restart the Bluetooth inquire
    var _this = this;
    SE.on( "disconnectedSphero", function( port, macAddress ) {

        ArrayUtils.removeObjectWithPropertyFromArray( _this.activeSpheros, "macAddress", macAddress );              // array, propertyName, propertyValue )

        // FIXME: Should be prevent to have 2 bluetoothInquire() running at the same time ?????? Yes...

        _this.bluetoothInquire();
        return;
    });

    // Repeatedly with 5 seconds interval while eager (by setTimeout)
    this.bluetoothInquire();

    return;     // end of SpheroConnectionManager()
};



/**
 *  bluetooth inquire + loop
 */
SpheroConnectionManager.prototype.bluetoothInquire  =  function()
{
    // --- Apple Mac case: no inquiring, use env HOC_DIRECT_SERIAL_PORTS
    if ( this.DIRECT_SERIAL_PORTS && this.DIRECT_SERIAL_PORTS.length > 0 ) {
        console.log( "\n=== Using DIRECT_SERIAL_PORTS connection mode with ports: %s \n", this.DIRECT_SERIAL_PORTS.toString() );
        for ( var dsp of this.DIRECT_SERIAL_PORTS ) {
            var isAvail = true;
            for ( var as of this.activeSpheros ) {
                if ( as.port == dsp ) {
                    isAvail = false;
                    console.log( "    Serial Port [%s] in use, skipping", dsp.toString() );
                    break;
                }
            }
            if (!isAvail)
                continue;
            // Init a new Cylon Sphero
            this.startNewCylonSphero( port, null );          // serialPort, macAddress      // TODO !!!
        }
        return;
    }

    // --- Spheros still connecting?
    if ( this.connectingInProcess && this.connectingInProcess.length > 0 ) {
        console.log("bluetoothInquire: a Sphero is still in the process of connecting, delaying by 5 seconds");
        var _this = this;
        setTimeout( function(){ _this.bluetoothInquire(); } , 5000 );            // retry after 5 seconds delay
        return;
    }

    // --- Enough Spheros connected already?
    if ( this.activeSpheros.length >= this.EAGER_SPHERO_MAX_COUNT ) {
        console.log( "\n=== Number of active Spheros already at EAGER_SPHERO_MAX_COUNT [%s] -> Skipping Inquire\n", this.EAGER_SPHERO_MAX_COUNT );
        return;
    }

    // --- Otw, we are supposed to be on Linux (RPi), and we'll find the Spheros automatically
    var cmdInquire  = "hcitool inq";            // TODO: if too slow to inquire, start hcitool spinq while eager, and hcitool epinq when done
    childProcess.exec( cmdInquire, function (error, stdout, stderr) {
        if (error) {
            console.error("ERROR Exec cmdInquire [%s]: %s\n", cmdInquire, error.toString() );
        }
        else {
            console.log( "Exec cmdInquire stdout: %s", stdout);
            console.warn("Exec cmdInquire stderr: %s", stderr);
            if ( stdout ) {
                stdout = stdout.uppercase();        // Just to be sure Mac address is with capital letters
                // Orbotix, Inc. Bluetooth OUI (macAddress Prefix) is 68:86:E7
                var pos = stdout.indexOf( "68:86:E7" );
                while ( pos >= 0 ) {
                    var macAddress = stdout.substr( pos, 17 );
                    if ( macAddress.length == 17 ) {
                        this.connectingInProcess.push( macAddress );
                        var _this = this;
                        setTimeout( function(){ _this.connectBtSphero( macAddress ); }, 0 );    // So not blocking main thread
                    }
                    pos = stdout.indexOf( "68:86:E7", pos + 17 );
                }
            }
        }
        // Ends by rescheduling bluetoothInquire()
        var _this = this;
        setTimeout( function(){ _this.bluetoothInquire(); } , 5000 );            // retry after 5 seconds delay
    });
    return;
}



/**
 *  Connect the Sphero found  through rfcomm and Bluetooth channel
 *      Look for a serial port /dev/rfcommXX available first, to connect
 *      May try up to 3 times on a given port
 */
SpheroConnectionManager.prototype.connectBtSphero  =  function( macAddress, rfcommIndexToTry, nbAttempts )
{
    if (! rfcommIndexToTry) {
        rfcommIndexToTry = 1;       // Always start at /dev/rfcomm1 so that if another process takes rfcomm0, we avoid collision
    } else if ( rfcommIndexToTry > 31 ) {
        console.error( "\nERROR in connectBtSphero: We have exhausted all /dev/rfcomm[1-31] . All ports fail for macAddress [%s]\n", macAddress );
        ArrayUtils.removeFromArray( this.connectingInProcess, macAddress );                // array, value
        return;
    }

    // --- First check there is no active Spheros on that port
    var isAvail = true;
    for (var as of this.activeSpheros ) {
        if ( as.port == "/dev/rfcomm"+rfcommIndexToTry ) {
            isAvail = false;
            console.log( "/dev/rfcomm [%d] Port is already in use, skipping", rfIdx );
            break;
        }
    }
    if (!isAvail) {
        var _this = this;
        setTimeout( function(){ _this.connectBtSphero( macAddress, 1 + rfcommIndexToTry ); }, 0 );    // So not blocking main thread
        return;
    }

    // --- Now try to connect on that port: Exec 'sudo rfcomm connect rfcommX {macAddress}'
    // var rfcommDev   = "/dev/rfcomm" + rfcommIndexToTry;
    var cmdRfcomm   = "sudo rfcomm connect rfcomm"+ rfcommIndexToTry +" "+ macAddress;
    var _this = this;
    childProcess.exec( cmdRfcomm,   function (error, stdOutContent, stdErrContent) {
        if (error) {
            console.error('ERROR in Exec rfcomm [%d, %s] : %s', rfcommIndexToTry, macAddress, error);
            // --- /dev/rfcommX already in use?  Otw try this port at most 3 times
            if (! nbAttempts)
                nbAttempts = 1;
            if ( error.toString().toLowerCase().indexOf("already in use") >= 0 || nbAttempts > 3 ) {
                setTimeout( function(){ _this.connectBtSphero( macAddress, 1 + rfcommIndexToTry ); }, 0 );    // So not blocking main thread
                return;
            }
            setTimeout( function(){ _this.connectBtSphero( macAddress, rfcommIndexToTry, 1 + nbAttempts ); }, 0 );    // So not blocking main thread
            return;
        }
        // Connection supposed to be a success!
        console.log( "\nHurray! Success connecting Sphero [%s] to rfcomm[%d]\n    stdOut=[%s]\n    stdErr=[%s]\n",
            macAddress, rfcommIndexToTry, stdOutContent, stdErrContent );
        ArrayUtils.removeFromArray( _this.connectingInProcess, macAddress );                // array, value

        // Launch new Cylon Sphero
        _this.startNewCylonSphero( "/dev/rfcomm"+rfcommIndexToTry, macAddress );
    });
    return;
}


/**
 *  Create a new CylonSphero through a direct serial Port.  macAddress may be null
 */
SpheroConnectionManager.prototype.startNewCylonSphero  =  function(port, macAddress)
{
    // Check it does not already exist
    for (var as of this.activeSpheros ) {
        if ( as.macAddress == macAddress ) {
            console.error( "\nERROR in startNewCylonSphero: macAddress=[%s] already in activeSpheros array, ports [in:%s, req:%s] !!\n",
                macAddress, as.port, port );
            // Trying to go ahead anyway...
        }
    }
    this.activeSpheros.push( { "port":port, "macAddress":macAddress } );        // Array of Objects { port: , macAddress: }


    // TODO fork()      // So it has access to globals

}


module.exports = SpheroConnectionManager;



/***
    // ---
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
***/
