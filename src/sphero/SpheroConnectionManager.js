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


// --- Spheros' colors & names.
//      Potentially could have different names and colors depending on the RPi
//      Warning: all names must be unique for a given RPi
global.STANDARD_SPHERO_LIST = [
    { name:"Santa",     color:0xFF0000 },                       // Add macAddress + activeUser (student name)
    { name:"Sapphire",  color:0x0000FF },
    { name:"Froggy",    color:0x00FF00 },
    { name:"Pumpkin",   color:0xff8800 },   // orange
    { name:"Amethyst",  color:0xFF00FF },   // purple
    { name:"Banana",    color:0xFFFF00 },   // yellow
    { name:"Turquoise", color:0x00FFFF }    // cyan - LAST
];
// Associative array Key= RPi-color, Value= list of {name:,color:} for Spheros
global.SPHERO_COLORS_FROM_RPI_MAP = {
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
    var macAddrs                    = (process.env.HOC_FORBIDDEN_SPHERO_MACADDRS || "").split(',');     // [ '' ] when not defined
    macAddrs.forEach( function( element, index, array ){
        // foreach trim, uppercase, and replace '-' by ':'
        element = element.trim().toUpperCase().replace(/\-/g,':');
        if (element) {
            this.FORBIDDEN_SPHERO_MACADDRS[ this.FORBIDDEN_SPHERO_MACADDRS.length ] = element;
        }
    }, this );  // Optional. Value to use as this when executing callback.

    // To bypass Bluetooth discovery and directly connect to Serial ports.
    //      Use this on Apple MACs: (ls /dev/tty.Sphero*). See http://cylonjs.com/documentation/platforms/sphero/
    //      HOC_DIRECT_SERIAL_PORTS="/dev/tty.Sphero-BBP-AMP-SPP, /dev/tty.Sphero-BBP-AMP-SQQ"
    this.DIRECT_SERIAL_PORTS = [];
    var serlPorts           = (process.env.HOC_DIRECT_SERIAL_PORTS || "").split(',');
    serlPorts.forEach( function( element, index, array ){
        element = element.trim();
        if (element) {
            this.DIRECT_SERIAL_PORTS[ this.DIRECT_SERIAL_PORTS.length ] = element.trim();
        }
    }, this );


    // ----- List of Spheros that the user can see in their browser, with HOC_FAVORITE_SPHERO_ATTRIBUTES added
    //       this.spheroAttributesByNamesMap[spheroName] = { name:, color:, macAddress: }
    global.RPI_SPHERO_LIST  = global.SPHERO_COLORS_FROM_RPI_MAP[ global.RPI_COLOR ]  || global.STANDARD_SPHERO_LIST;
    this.spheroAttributesByNamesMap  = {};                                      //  Object (and NOT Associative array)
    for (var rsl of global.RPI_SPHERO_LIST) {
            this.spheroAttributesByNamesMap[ rsl.name ] = rsl;
    }
    // Add env HOC_FAVORITE_SPHERO_ATTRIBUTES preferences
    var envFavSpheroAttributes = null;
    try { envFavSpheroAttributes = JSON.parse( process.env.HOC_FAVORITE_SPHERO_ATTRIBUTES ); }
    catch(exc) {}
    if ( envFavSpheroAttributes ) {
        for (var fsa of envFavSpheroAttributes) {
            if ( !fsa.name || !fsa.macAddress )
                continue;
            if ( this.spheroAttributesByNamesMap[ fsa.name ] ) {
                this.spheroAttributesByNamesMap[ fsa.name ].macAddress = fsa.macAddress;
                continue;
            }
            // Otw new sphero name & color
            if ( !fsa.color ) {
                console.error("\nERROR in env HOC_FAVORITE_SPHERO_ATTRIBUTES, no COLOR defined for name=[%s]: IGNORING\n", fsa.name);
                continue;
            }
            this.spheroAttributesByNamesMap[ fsa.name ] = fsa;
        }
    }       // Done about  this.spheroAttributesByNamesMap[spheroName] = { name:, color:, macAddress: }


    // +++++++ Keeping track of Active and recently Disconnected Spheros
    //
    // FIXME: USER NAME ????
    this.activeSpherosMap       = {};       // Object (and NOT Associative array) of Key = macAddress,
                                            //    Values = { port:, macAddress:, name:, color:, user: }
    this.disconnectedSpherosMap = {};       // Object (and NOT Associative array) same structure as activeSpherosMap         // TODO
    this.connectingInProcess    = [];       // Array of macAddresses of Spheros getting connected (between inquire and connect)
    this.isInquiring            = false;    // Only once at a time: prevent to have 2 bluetoothInquire() running at the same time
    // Child processes: These js object have circular references and consequently break JSON.stringify: we store them separately
    this.childProcessesMap      = {};       // Object (and NOT Associative array) of Key = macAddress, Object = childProc
    // Storing mySphero objects from CylonSphero
    this.mySpherosMap           = {};       // Object (and NOT Associative array) of Key = macAddress, Object = mySphero     // TODO

// TODO: la connection entre l'interface et le Cylon doit se faire par * macAddress *
//      Il faudrait qu'on puisse avoir dans l'interface les positions, etc (mySpherosMap)


// TODO: SE.on( "disconnected", ... eagerness back !!!

    var _this = this;
    SE.on( "disconnectedSphero", function( port, macAddress ) {
        // If a Sphero gets disconnected, restart the Bluetooth inquire
        // FIXME: kill proc ???
        delete _this.activeSpherosMap[ macAddress ];       // Warning: setting to null is not enough, it keeps the key in the array!
        // ArrayUtils.removeObjectWithPropertyFromArray( _this.activeSpherosMap, "macAddress", macAddress );     // array, propertyName, propertyValue )

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
            var elm = ArrayUtils.findFirstObjectWithPropertyInArray( this.activeSpherosMap, "port", dsp );  // array, propertyName, propertyValue )
            if ( elm ) {
                console.log( "    Serial Port [%s] in use, skipping", dsp );
                continue;
            }
            // Init a new Cylon Sphero
            this.startNewCylonSphero( dsp, null );          // serialPort, macAddress
        }
        return;
    }
    var _this = this;

    // --- isInquiring or Spheros still connecting?
    if ( this.isInquiring || ( this.connectingInProcess && this.connectingInProcess.length > 0 ) ) {
        console.log("bluetoothInquire: a Sphero is still in the process of connecting, delaying by 5 seconds");
        setTimeout( function(){ _this.bluetoothInquire(); } , 5000 );            // retry after 5 seconds delay
        return;
    }

    // --- Enough Spheros connected already?
    if ( Object.keys( this.activeSpherosMap ).length >= this.EAGER_SPHERO_MAX_COUNT ) {
        console.log( "\n=== Number of active Spheros already at EAGER_SPHERO_MAX_COUNT [%s] -> Skipping Inquire\n", this.EAGER_SPHERO_MAX_COUNT );
        return;
    }

    // --- Otw, we are supposed to be on Linux (RPi), and we'll find the Spheros automatically
    var cmdInquire      = "hcitool inq";            // TODO: if too slow to inquire, start hcitool spinq while eager, and hcitool epinq when done
    this.isInquiring    = true;
    try {
        childProcess.exec( cmdInquire, function (error, stdOutContent, stdErrContent) {
            if (error) {
                console.error("ERROR Exec cmdInquire [%s]: %s\n", cmdInquire, error.toString() );
            }
            else {
                console.log( "Exec cmdInquire stdOutContent: %s", stdOutContent);
                if (stdErrContent) {
                    console.warn("Exec cmdInquire stdErrContent: %s", stdErrContent);
                }
                if ( stdOutContent ) {
                    stdOutContent = stdOutContent.toUpperCase();        // Just to be sure Mac address is with capital letters
                    // Orbotix, Inc. Bluetooth OUI (macAddress Prefix) is 68:86:E7
                    var pos = stdOutContent.indexOf( "68:86:E7" );
                    while ( pos >= 0 ) {
                        var macAddress = stdOutContent.substr( pos, 17 );
                        if ( macAddress.length == 17 ) {
                            // Is this Sphero macAddress allowed?
                            if ( _this.FORBIDDEN_SPHERO_MACADDRS.indexOf( macAddress ) < 0 ) {
                                // --- Ok, now we do connect!
                                _this.connectingInProcess.push( macAddress );
                                var _zis = _this;
                                setTimeout( function(){ _zis.connectBtSphero( macAddress ); }, 0 );    // So not blocking main thread
                            }
                        }
                        pos = stdOutContent.indexOf( "68:86:E7", pos + macAddress.length );
                    }
                }
            }
            // Ends by rescheduling bluetoothInquire()
            _this.isInquiring = false;
            var _zis = _this;
            setTimeout( function(){ _zis.bluetoothInquire(); } , 5000 );            // retry after 5 seconds delay
        });
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in SpheroConnectionManager.bluetoothInquire: " + exc.stack + "\n" ); }
    return;
}



/**
 *  Connect the Sphero found  through rfcomm and Bluetooth channel
 *      Look for a serial port /dev/rfcommXX available first, to connect
 *      May try up to 3 times on a given port
 */
SpheroConnectionManager.prototype.connectBtSphero  =  function( macAddress, rfcommIndexToTry, nbAttempts )
{
    console.log("DEBUG SpheroConnectionManager.connectBtSphero macAddress=[%s], rfcommIndexToTry=[%s], nbAttempts=[%s]",
        macAddress, rfcommIndexToTry, nbAttempts );
    if (! rfcommIndexToTry) {
        rfcommIndexToTry = 1;       // Always start at /dev/rfcomm1 so that if another process takes rfcomm0, we avoid collision
    } else if ( rfcommIndexToTry > 31 ) {
        console.error( "\nERROR in connectBtSphero: We have exhausted all /dev/rfcomm[1-31] . All ports fail for macAddress [%s]\n", macAddress );
        ArrayUtils.removeFromArray( this.connectingInProcess, macAddress );                // array, value
        return;
    }

    // --- First check there is no active Spheros on that port
    var elm = ArrayUtils.findFirstObjectWithPropertyInArray( this.activeSpherosMap, "port", "/dev/rfcomm"+rfcommIndexToTry );  // array, propertyName, propertyValue )
    if (elm) {
        console.log( "/dev/rfcomm [%d] Port is already in use, skipping", rfIdx );
        var _this = this;
        setTimeout( function(){ _this.connectBtSphero( macAddress, 1 + rfcommIndexToTry ); }, 0 );    // So not blocking main thread
        return;
    }

    // --- Now try to connect on that port: Exec 'sudo rfcomm connect rfcommX {macAddress}'
    // var rfcommDev   = "/dev/rfcomm" + rfcommIndexToTry;
    var cmdRfcomm   = "sudo rfcomm connect rfcomm"+ rfcommIndexToTry +" "+ macAddress +" &";
    var _this = this;
    childProcess.exec( cmdRfcomm,   function (error, stdOutContent, stdErrContent) {
        if (error || stdErrContent) {
            console.error('ERROR in Exec %s  || error is: ', cmdRfcomm);
            console.error( error );
            // --- /dev/rfcommX already in use?  Otw try this port at most 3 times
            if (! nbAttempts)
                nbAttempts = 1;
            if ( (error && error.toString().toLowerCase().indexOf("already in use") >= 0) || nbAttempts > 3 ) {
                setTimeout( function(){ _this.connectBtSphero( macAddress, 1 + rfcommIndexToTry ); }, 0 );    // So not blocking main thread
                return;
            }
            setTimeout( function(){ _this.connectBtSphero( macAddress, rfcommIndexToTry, 1 + nbAttempts ); }, 0 );    // So not blocking main thread
            return;
        }
        // FIXME: Does NOT callback when works!!!
        // Connection supposed to be a success!
        console.log( "\nHurray! Success connecting Sphero [%s] to rfcomm[%d]\n    stdOut=[%s]\n    stdErr=[%s]\n",
            macAddress, rfcommIndexToTry, stdOutContent, stdErrContent );
        ArrayUtils.removeFromArray( _this.connectingInProcess, macAddress );                // array, value

        // Launch new Cylon Sphero
        _this.startNewCylonSphero( "/dev/rfcomm"+rfcommIndexToTry, macAddress );
    });
    console.log("DEBUG END of SpheroConnectionManager.connectBtSphero macAddress=[%s], rfcommIndexToTry=[%s], nbAttempts=[%s]",
        macAddress, rfcommIndexToTry, nbAttempts );
    return;
}


/**
 *  Create a new CylonSphero through a direct serial Port.
 *      macAddress may be null if HOC_DIRECT_SERIAL_PORTS is set
 */
SpheroConnectionManager.prototype.startNewCylonSphero  =  function(port, macAddress)
{
    if ( !port || (!macAddress && this.DIRECT_SERIAL_PORTS.length == 0) ) {
        console.error( "\nERROR in startNewCylonSphero: PARAM NULL port=[%s] macAddress=[%s] !!\n", port, macAddress );
        return;
    }
    // on MacOS, we don't get the MacAddress, so we just store the port as MacAddress instead
    if ( !macAddress && this.DIRECT_SERIAL_PORTS.length > 0 ) {
        macAddress = port;
    }

    // --- Check it does not already exist
    if ( this.activeSpherosMap[ macAddress ] ) {
        console.error( "\nERROR in startNewCylonSphero: activeSpherosMap has already macAddress=[%s], value [%s] !!\n", macAddress, this.activeSpherosMap[macAddress] );
        // FIXME
    }


    // --- Assign color and name to Sphero
    var spheroAttributes = this.findBestSpheroAttributes( macAddress ) || { "name":"UNKNOWN", "color":0xFFFFFF };
    console.log( "INFO in startNewCylonSphero: new Sphero macAddress=[%s] gets findBestSpheroAttributes: ", macAddress);
    console.log( spheroAttributes );
    var name  = spheroAttributes.name;
    var color = spheroAttributes.color;
    // Assert the name is not already in activeSpherosMap
    var assertElm = ArrayUtils.findFirstObjectWithPropertyInArray( this.activeSpherosMap, "name", name );  // array, propertyName, propertyValue )
    if ( assertElm ) {
        console.error( "\nERROR in startNewCylonSphero: activeSpherosMap already has name=[%s], value [%s] !!\n", name, this.activeSpherosMap[macAddress] );
    }

    // --- Start the new process
    var args      = [ port, macAddress, name, color, 0 ];   // FIXME: STARTING_POS_Y_CORRECTION        // <=> process.argv[2..6] in child
    var childProc = childProcess.fork( __dirname + '/CylonSphero.js', args );       // args Array List of string arguments

    // Store as activeSpherosMap
    this.activeSpherosMap[macAddress]   = { "port":port, "macAddress":macAddress, "name":name, "color":color };     // Array of Objects { port: , macAddress:, color:... }
    this.childProcessesMap[macAddress]  = childProc;

    // --- Communication between forked process and this master process.  msg = { type:, macAddress:, ...}
    var _this = this;
    childProc.on('message', function(msg) {
        switch (msg.type) {
            case "dataStreaming":                                               // msg = { type:, macAddress:, mySphero:}
                _this.mySpherosMap[ msg.macAddress ] = JSON.parse( msg.mySphero ); // Key = macAddress, Object = mySphero
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
    childProc.on('error', function (err) {
        console.error( "\nERROR in SpheroConnectionManager.childProc.on.ERROR:");
        console.error( err );
        return;                                                                 // TODO ????
    });


    // --- Exit or disconnect in childProc process
    childProc.on('exit', function (data) {                                      // stdio might still be open and running
        console.info( "INFO in SpheroConnectionManager.childProc.on.EXIT:");
        console.info( data );
        return;                                                                 // TODO ????
    });
    childProc.on('close', function (data) {                                     // stdio all done (but may still be open if shared)
        console.info( "INFO in SpheroConnectionManager.childProc.on.CLOSE:");
        console.info( data );
        return;                                                                 // TODO ????
    });
    childProc.on('disconnected', function (data) {                              // .disconnect() called, no more messages possible
        console.info( "INFO in SpheroConnectionManager.childProc.on.DISCONNECTED:");
        console.info( data );
        return;                                                                 // TODO ????
    });

    /*
        childProc.send({ hello: 'world' });
    */


    // --- Signals an updated activeSpherosMap (here a new activeSphero)
    SE.emit( 'activeSpherosMap' );                                              // TODO: do the same for disconnection !!!!

    return;         // end of startNewCylonSphero()
}


/** Find the best attributes {name:, color:} for this newly (re-)connected Sphero */
SpheroConnectionManager.prototype.findBestSpheroAttributes  =  function( macAddress )
{
    if ( !macAddress ) {
        console.error( "\nERROR in findBestSpheroAttributes: macAddress PARAM NULL !!\n" );
        return null;
    }

    // 1. In disconnectedSpherosMap? Try to reuse the same attributes on reconnection
    var disconnectedSphero = this.disconnectedSpherosMap[ macAddress ];
    if ( disconnectedSphero ) {
        return disconnectedSphero;
    }

    // 2. Is there favorite attributes for this macAddress in global defined list?
    var elm = ArrayUtils.findFirstObjectWithPropertyInArray( this.spheroAttributesByNamesMap, "macAddress", macAddress );  // array, propertyName, propertyValue )
    if (elm) {
        return elm;
    }

    // 3. Get the first available from this.spheroAttributesByNamesMap, always in the same order "for of"
    for ( var key in this.spheroAttributesByNamesMap ) {
        var namColor = this.spheroAttributesByNamesMap[key];
        elm = ArrayUtils.findFirstObjectWithPropertyInArray( this.activeSpherosMap, "name", namColor.name );  // array, propertyName, propertyValue )
        if (! elm) {
            return namColor;
        }
    }

    // Error, nothing found!
    console.error( "\nERROR in findBestSpheroAttributes: NO AVAILABLE SpheroAttributes found !!\n" );
    return null;    // { "name":"UNKNOWN", "color":0xFFFFFF };
}



// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

/**
 * Code pushed by User from browser
 */
SpheroConnectionManager.prototype.pushCode  =  function( browserMacAddress, browserUser, browserUserCode )
{
    var activeSphero = this.activeSpherosMap[browserMacAddress];
    if ( !browserUser || !activeSphero ) {
        console.error("ERROR in SpheroConnectionManager.pushCode: WRONG PARAMs macAddress=[%s], user=[%s]", browserMacAddress, browserUser);
        return;
    }

    // --- Is there an active childProcess?
    var childProc = this.childProcessesMap[browserMacAddress];
    if (! childProc ) {
        console.error("ERROR in SpheroConnectionManager.pushCode: NO CHILD PROCESS for macAddress=[%s], user=[%s]", browserMacAddress, browserUser);

        // TODO: signal disconnect !! Or make sure it is connecting
        return;
    }

    // --- Ok, send the new code to this childProc
    if (!browserUserCode) {
        console.info("INFO in SpheroConnectionManager.pushCode: code EMPTY so perform STOP, for macAddress=[%s], user=[%s]", browserMacAddress, browserUser);
        childProc.send( JSON.stringify( { "action": "stop-code" } ) );
        return;
    }

    childProc.send( JSON.stringify( { "action": "push-code", "userCode": browserUserCode } ) );
    return;
}


/**
 * Stop order from user browser
 */
SpheroConnectionManager.prototype.stopCode  =  function( browserMacAddress, browserUser )
{
    console.info("INFO in SpheroConnectionManager.stopCode: for macAddress=[%s], user=[%s]", browserMacAddress, browserUser);
    this.pushCode( browserMacAddress, browserUser, "" );
    return;
}





// TODO: MAPPING must be for ALL Spheros, with macAddress as param => NOT in startNewCylonSphero !!
// TODO map SE.on signaling to childProc.send & .on()
// For code push, error and info update


module.exports = SpheroConnectionManager;
