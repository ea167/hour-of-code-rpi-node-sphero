/**
 *  Template to run the code the user pushes to the RPi+Sphero
 */

// SUPPOSED TO BE DEFINED (prepended before thread eval)
// var mySphero
// var userCode

function startSpheroThread()
{
    // --0-- Check mySphero and userCode variables
    if ( !mySphero || typeof userCode === "undefined" ) {
        console.warn( "CylonRobot [%s] USER-CODE VARIABLES error, userCode: \n%s\n", mySphero.hocIndex, userCode );
        SE.emit( "sphero-internal-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": "mySphero/userCode not defined" }) );
        return;
    }


    // --1-- Check we can successfully insert the user code
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


    // --2-- Finish Calibration, and follow with once() and loop();  Instructions are executed sequentially by Sphero, so no need to .then()
    mySphero.finishCalibration();


    // --3-- Try to run once()
    try {
        blockToRun.once( mySphero );
    }
    catch( exc ) {
        console.warn( "CylonRobot [%s] USER-CODE ONCE error: %s\n", mySphero.hocIndex, exc.stack );
        // console.error( "\nTRY-CATCH ERROR in ThreadedSpheroUserCodeRun: " + exc.stack + "\n" ); }
        SE.emit( "sphero-code-once-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
        return;
    }


    // --4-- Try to loop(). Starts after 100ms, which is good to let finishCalibration complete
    var intervalLoop = setInterval( tryCatchLoop, 100 );            // Check it keeps the thread live !!!!!

    function tryCatchLoop() {
        try {
            blockToRun.loop( blockToRun.mySphero );
        }
        catch( exc ) {
            console.warn( "CylonRobot [%s] USER-CODE LOOP error: %s\n", mySphero.hocIndex, exc.stack );
            // console.error( "\nTRY-CATCH ERROR in ThreadedSpheroUserCodeRun: " + exc.stack + "\n" ); }
            SE.emit( "sphero-code-loop-error", JSON.stringify({ "spheroIndex": mySphero.hocIndex, "exception": exc }) );
            // Trying to continue, until the user stops it!
            return;
        }
    }
} // end of startSpheroThread()


// -----
if (thread)  {
    console.log( "\n*** CylonRobot [%s] INSIDE USER-CODE THREADED CALL\n", mySphero.hocIndex );
    startSpheroThread();
} else {
    console.log( "\n*** CylonRobot [%s] INSIDE USER-CODE NON-THREADED call\n", mySphero.hocIndex );
}



/**
 *  Wrapper for user code
 */
function runUserSphero( mySphero, userCode )
{
    this.mySphero = mySphero;
    console.log( "\nTHREAD CylonRobot [%s] starting eval code:\n", mySphero.hocIndex );

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

    // --- Abort the loop
    function endLoops() {
        clearInterval( intervalLoop );
        // End thread (and Sphero, but should be automatic when thread ends)
        return;
    }
}
