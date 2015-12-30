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
 *      // List of favorite bindings. JSON list of objects {macAddress:,name:}
 *      //      or for completely new names {macAddress:'68:86:E7:22:11:33',name:'BB-8',color:'0x99ff33'}
 *      HOC_FAVORITE_SPHERO_ATTRIBUTES="[{macAddress:'68:86:E7:22:11:00',name:'Santa'},{macAddress:'68:86:E7:22:11:33',name:'Turquoise'}]"
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

// Array utils
var ArrayUtils = require("../utils/ArrayUtils");

// Sphero & log events
var SpheroEvents    = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here


// Spheros' colors & names. Associative array Key= RPi-color, Value= list of {name:,color:} for Spheros
// Potentially could have different names and colors depending on the RPi
global.STANDARD_SPHERO_LIST = [
    { name:"Santa",     color:0xFF0000 },                       // Add macAddress + activeUser (student name)
    { name:"Sapphire",  color:0x0000FF },
    { name:"Froggy",    color:0x00FF00 },
    { name:"Pumpkin",   color:0xff8800 },   // orange
    { name:"Amethyst",  color:0xFF00FF },   // purple
    { name:"Banana",    color:0xFFFF00 },   // yellow
    { name:"Turquoise", color:0x00FFFF }    // cyan - LAST
];
global.SPHERO_COLORS_FROM_RPI = {
    "red":      global.STANDARD_SPHERO_LIST,
    "green":    global.STANDARD_SPHERO_LIST,
    "blue":     global.STANDARD_SPHERO_LIST,
    "yellow":   global.STANDARD_SPHERO_LIST,
    "purple":   global.STANDARD_SPHERO_LIST     // LAST
};



/**
 *  Main
 */
function SpheroConnectionManager()
{
    // ----- ENV & Globals

    // RPi Color
    global.RPI_COLOR                = process.env.HOC_COLOR || "purple";

    // Aggressive connection mode until the number of connected Spheros equals this one
    this.EAGER_SPHERO_MAX_COUNT     = Number( process.env.HOC_EAGER_SPHERO_MAX_COUNT ) || 2;   // Note: (NaN) false, (!NaN) true

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


    // ----- List of Spheros that the user can see in their browser, with HOC_FAVORITE_SPHERO_ATTRIBUTES added
    //       this.userSpherosByName[spheroName] = { name:, color:, macAddress:, activeUser: }
    global.RPI_SPHERO_LIST  = global.SPHERO_COLORS_FROM_RPI[ global.RPI_COLOR ]  || global.STANDARD_SPHERO_LIST;
    this.userSpherosByName  = [];
    for (var rsl of global.RPI_SPHERO_LIST) {
            this.userSpherosByName[ rsl.name ] = rsl;
    }
    // Add env HOC_FAVORITE_SPHERO_ATTRIBUTES preferences
    var envFavSpheroAttributes = null;
    try { envFavSpheroAttributes = JSON.parse( process.env.HOC_FAVORITE_SPHERO_ATTRIBUTES ); }
    catch(exc) {}
    if ( envFavSpheroAttributes ) {
        for (var fsa of envFavSpheroAttributes) {
            if ( !fsa.name || !fsa.macAddress )
                continue;
            if ( this.userSpherosByName[ fsa.name ] ) {
                this.userSpherosByName[ fsa.name ].macAddress = fsa.macAddress;
                continue;
            }
            // Otw new sphero name & color
            if ( !fsa.color ) {
                console.error("\nERROR in env HOC_FAVORITE_SPHERO_ATTRIBUTES, no COLOR defined for name=[%s]: IGNORING\n", fsa.name);
                continue;
            }
            this.userSpherosByName[ fsa.name ] = fsa;
            this.userSpherosByName[ fsa.name ].activeUser = null;
        }
    }       // Done about  this.userSpherosByName[spheroName] = { name:, color:, macAddress:, activeUser: }


    // ----- Keeping track of Active and recently Disconnected Spheros
    this.activeSpheros       = [];      // Associative array of Key = macAddress, Objects = { port:, macAddress:, color:, proc: }
    this.disconnectedSpheros = [];      // TODO
    this.connectingInProcess = [];      // Array of macAddresses of Spheros getting connected (between inquire and connect)
    this.isInquiring         = false;   // Only once at a time: prevent to have 2 bluetoothInquire() running at the same time
    // Storing mySphero objects from CylonSphero
    this.mySpheros           = [];      // Associative array of Key = macAddress, Object = mySphero  // TODO

// TODO: la connection entre l'interface et le Cylon doit se faire par * macAddress *
//      Il faudrait qu'on puisse avoir dans l'interface les positions, etc (mySpheros)


// TODO: SE.on( "disconnected", ... eagerness back !!!

    var _this = this;
    SE.on( "disconnectedSphero", function( port, macAddress ) {
        // If a Sphero gets disconnected, restart the Bluetooth inquire
        // FIXME: kill proc ???
        delete _this.activeSpheros[ macAddress ];       // Warning: setting to null is not enough, it keeps the key in the array!
        // ArrayUtils.removeObjectWithPropertyFromArray( _this.activeSpheros, "macAddress", macAddress );     // array, propertyName, propertyValue )

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
            this.startNewCylonSphero( port, null );          // serialPort, macAddress
        }
        return;
    }

    // --- isInquiring or Spheros still connecting?
    if ( this.isInquiring || ( this.connectingInProcess && this.connectingInProcess.length > 0 ) ) {
        console.log("bluetoothInquire: a Sphero is still in the process of connecting, delaying by 5 seconds");
        var _this = this;
        setTimeout( function(){ _this.bluetoothInquire(); } , 5000 );            // retry after 5 seconds delay
        return;
    }

    // --- Enough Spheros connected already?
    if ( Object.keys( this.activeSpheros ).length >= this.EAGER_SPHERO_MAX_COUNT ) {
        console.log( "\n=== Number of active Spheros already at EAGER_SPHERO_MAX_COUNT [%s] -> Skipping Inquire\n", this.EAGER_SPHERO_MAX_COUNT );
        return;
    }

    // --- Otw, we are supposed to be on Linux (RPi), and we'll find the Spheros automatically
    var cmdInquire      = "hcitool inq";            // TODO: if too slow to inquire, start hcitool spinq while eager, and hcitool epinq when done
    this.isInquiring    = true;
    childProcess.exec( cmdInquire, function (error, stdOutContent, stdErrContent) {
        if (error) {
            console.error("ERROR Exec cmdInquire [%s]: %s\n", cmdInquire, error.toString() );
        }
        else {
            console.log( "Exec cmdInquire stdOutContent: %s", stdOutContent);
            console.warn("Exec cmdInquire stdErrContent: %s", stdErrContent);
            if ( stdOutContent ) {
                stdOutContent = stdOutContent.toUpperCase();        // Just to be sure Mac address is with capital letters
                // Orbotix, Inc. Bluetooth OUI (macAddress Prefix) is 68:86:E7
                var pos = stdOutContent.indexOf( "68:86:E7" );
                while ( pos >= 0 ) {
                    var macAddress = stdOutContent.substr( pos, 17 );
                    if ( macAddress.length == 17 ) {
                        // Is this Sphero macAddress allowed?
                        if ( this.FORBIDDEN_SPHERO_MACADDRS.indexOf( macAddress ) < 0 ) {
                            // --- Ok, now we do connect!
                            this.connectingInProcess.push( macAddress );
                            var _this = this;
                            setTimeout( function(){ _this.connectBtSphero( macAddress ); }, 0 );    // So not blocking main thread
                        }
                    }
                    pos = stdOutContent.indexOf( "68:86:E7", pos + macAddress.length );
                }
            }
        }
        // Ends by rescheduling bluetoothInquire()
        this.isInquiring = false;
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
    if ( !port || !macAddress ) {
        console.error( "\nERROR in startNewCylonSphero: PARAM NULL port=[%s] macAddress=[%s] !!\n", port, macAddress );
        return;
    }
    // --- Check it does not already exist
    if ( this.activeSpheros[ macAddress ] ) {
        console.error( "\nERROR in startNewCylonSphero: activeSpheros has already macAddress=[%s], value [%s] !!\n", macAddress, this.activeSpheros[macAddress] );
        // FIXME
    }

    // --- Assign color to Sphero
    // TODO: Set up COLOR !!!!
    var color = "green";            // FIXME


    // --- Start the new process
    var args      = [ port, macAddress, color ];                                // <=> process.argv[2..4] in child
    var childProc = childProcess.fork( __dirname + '/CylonSphero.js', args );   // args Array List of string arguments

    // --- Store as activeSpheros
    this.activeSpheros[macAddress] = { "port":port, "macAddress":macAddress, "color":color, "proc":childProc };     // Array of Objects { port: , macAddress:, color: }

    // --- Communication between forked process and this master process.  msg = { type:, macAddress:, ...}
    var _this = this;
    childProc.on('message', function(msg) {
        switch (msg.type) {
            case "dataStreaming":                                               // msg = { type:, macAddress:, mySphero:}
                _this.mySpheros[ msg.macAddress ] = JSON.parse( msg.mySphero ); // Key = macAddress, Object = mySphero
                break;

            // TODO !!!

            // TODO: Disconnects (should the process exit ???)

            // TODO: Alerts

            default:
                console.error( "\nERROR in SpheroConnectionManager.childProc.on.MESSAGE, msg is:" );
                console.error( msg );
                return;
        }
        return;
    });


    // --- Error catching in childProc process
    child.on('error', function (err) {
        console.error( "\nERROR in SpheroConnectionManager.childProc.on.ERROR:");
        console.error( err );
        return;                                                                 // TODO ????
    });


    // --- Exit or disconnect in childProc process
    child.on('exit', function (data) {                                          // stdio might still be open and running
        console.info( "INFO in SpheroConnectionManager.childProc.on.EXIT:");
        console.info( data );
        return;                                                                 // TODO ????
    });
    child.on('close', function (data) {                                          // stdio all done (but may still be open if shared)
        console.info( "INFO in SpheroConnectionManager.childProc.on.CLOSE:");
        console.info( data );
        return;                                                                 // TODO ????
    });
    child.on('disconnected', function (data) {                                          // .disconnect() called, no more messages possible
        console.info( "INFO in SpheroConnectionManager.childProc.on.DISCONNECTED:");
        console.info( data );
        return;                                                                 // TODO ????
    });


    /*
        childProc.send({ hello: 'world' });
    */

    return;         // end of startNewCylonSphero()
}


// TODO: MAPPING must be for ALL Spheros, with macAddress as param => NOT in startNewCylonSphero !!
// TODO map SE.on signaling to child.send & .on()
// For code push, error and info update




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
            function (error, stdOutContent, stdErrContent) {
                console.log('Exec rfcomm stdOutContent: ' + stdOutContent);
                console.warn('Exec rfcomm stdErrContent: ' + stdErrContent);
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
