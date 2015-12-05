/**
 *  Template to run the code the user pushes to the RPi+Sphero
 */

var vm = require('vm');

// SUPPOSED TO BE DEFINED (prepended before thread eval)
// var mySphero
// var userCode

// FIXME: SE !!!

function runSpheroUserCode( mySphero, userCode )
{
    // --0-- Check mySphero and userCode variables
    if ( !mySphero || typeof userCode === "undefined" ) {
        console.warn( "CylonRobot [%s] USER-CODE VARIABLES error, userCode: \n%s\n", mySphero.hocIndex, userCode );
        SE.emit( "sphero-internal-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": "mySphero/userCode not defined" }) );
        return;
    }

    // --1-- Turn off the tail Led, and follow by once() and loop();  Instructions are executed sequentially by Sphero, so no need to .then()
    try {
        mySphero.setBackLed( 0 );
    }
    catch( exc ) { console.warn( "CylonRobot [%s] setBackLed error: %s\n", mySphero.hocIndex, exc.stack ); }


    // --2-- Create the sandbox for to execute the user code
    var sandbox = {
        mySphero:       mySphero,
        intervalLoop:   null,
        setInterval:    setInterval,        // Globals in node.js, not available anymore when sandboxed!
        clearInterval:  clearInterval
    };
    vm.createContext(sandbox);


    // --3-- Add execution code to the userCode, to run once() and loop()
    var totalCode   = " function once(mySphero) {} function loop(mySphero) {} "     // To make sure they are defined
                    + userCode
                    + "\n /* */ function check_the_syntax_of_your_code() {} /* */ \n"
                    + "\n if (once && typeof once === 'function') { try { once(mySphero); } catch(exc) { "
                    + "\n     console.warn( 'CylonRobot [%s] USER-CODE ONCE error: %s\\n', mySphero.hocIndex, exc.stack );  "
                    // + SE.emit( "sphero-code-once-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
                    + "\n } } "
                    + "\n if (loop && typeof loop === 'function') { intervalLoop = setInterval( tryCatchLoop, 90 ); } "     // Every 100ms
                    + "\n function tryCatchLoop() { try { loop(mySphero); } catch(exc) { "
                    + "\n     console.warn( 'CylonRobot [%s] USER-CODE LOOP error: %s\\n', mySphero.hocIndex, exc.stack ); "
                    // + SE.emit( "sphero-code-loop-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
                    + "\n } } "
                    + "\n function endLoops() { clearInterval( intervalLoop ); } ";
    // FIXME: debug info !!!!
    console.log( "\ntotalCode:\n" + totalCode +"\n\n" );


    // --4-- Run it in the sandbox
    try {
        vm.runInContext( totalCode, sandbox );
    }
    catch( exc ) {
        console.warn( "CylonRobot [%s] VM.runInContext error: %s\n", mySphero.hocIndex, exc.stack );
        ///SE.emit( "sphero-code-vm-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
        return;
    }
} // end of runSpheroUserCode()


/* // --- In case of thread
if (mySphero) {
    runSpheroUserCode( mySphero, userCode );
} */

exports.runSpheroUserCode = runSpheroUserCode;



/***   USER CODE IN EDITOR -- SEE code-examples/default.js
    // -------------------------------------

    // Define variables here if needed
    // var count = 1;

    function once( mySphero )
    {
        // Write code here, that will be executed only once at the beginning
    }

    function loop( mySphero )           // setInterval every 100ms (10 times per second)
    {
        // Write here code that will be run 10 times per second, looping indefinitely

        // Call endLoops() if you want to abort next loops
    }

    // -------------------------------------
***/
