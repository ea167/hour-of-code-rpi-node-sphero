/**
 *  Template to run the code the user pushes to the RPi+Sphero
 */

// SUPPOSED TO BE DEFINED:
// var mySphero
// var userCode

// --0-- Check we can successfully insert the user code
var blockToRun = null;
try {
    blockToRun = new runUserSphero( mySphero );
}
catch( exc ) {
    console.warn( "CylonRobot [%s] USER-CODE SYNTAX error: %s\n", mySphero.hocIndex, exc.stack );
    // console.error( "\nTRY-CATCH ERROR in ThreadedSpheroUserCodeRun: " + exc.stack + "\n" ); }
    SE.emit( "sphero-code-syntax-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
    return;
}

if (! blockToRun) {
    console.warn( "CylonRobot [%s] USER-CODE SYNTAX error\n", mySphero.hocIndex );
    SE.emit( "sphero-code-syntax-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex }) );
    return;
}


// --1-- Try to run once()
try {
    blockToRun.once( blockToRun.mySphero );
}
catch( exc ) {
    console.warn( "CylonRobot [%s] USER-CODE ONCE error: %s\n", mySphero.hocIndex, exc.stack );
    // console.error( "\nTRY-CATCH ERROR in ThreadedSpheroUserCodeRun: " + exc.stack + "\n" ); }
    SE.emit( "sphero-code-once-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
    return;
}

// --2-- Try to loop()
var intervalLoop = setInterval( tryCatchLoop, 100 );            // Check it keeps the thread live !!!!!

function tryCatchLoop() {
    try {
        blockToRun.loop( blockToRun.mySphero );
    }
    catch( exc ) {
        console.warn( "CylonRobot [%s] USER-CODE LOOP error: %s\n", mySphero.hocIndex, exc.stack );
        // console.error( "\nTRY-CATCH ERROR in ThreadedSpheroUserCodeRun: " + exc.stack + "\n" ); }
        SE.emit( "sphero-code-loop-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );

        // TODO: ABORT ???
        return;
    }
}


// TODO When return, do a STOP! (calibration, tail, etc.)





/**
 *  Wrapper for user code
 */
function runUserSphero( mySphero, userCode )
{
    this.mySphero = mySphero;

    // --- User code is FILLED HERE!!
    try {
        eval( userCode );
    }
    catch( exc ) {
        console.warn( "CylonRobot [%s] USER-CODE EVAL error: %s\n", mySphero.hocIndex, exc.stack );
        // console.error( "\nTRY-CATCH ERROR in ThreadedSpheroUserCodeRun: " + exc.stack + "\n" ); }
        SE.emit( "sphero-code-eval-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
        return;
    }

/***   USER CODE IN EDITOR
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

        // Call end() if you want to abort & end the loop
    }

    // -------------------------------------
***/

    function end() {
        // End thread (and Sphero, but should be automatic when thread ends)
        // TODO !!!!
    }

    return;
}
