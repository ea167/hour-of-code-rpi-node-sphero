// --- Define variables used across loops here, if needed 5
// var count = 1;

/*** Your goal here is to follow the other Sphero ***/


function once( mySphero )
{
    // --- Write code here, that will be executed only once at the beginning

    // Example:
    //mySphero.roll( 50, 45 );     // Speed, heading 0..359 degrees

    return;
}


function loop( mySphero )
{
    // --- Write here code that will be run 2 times per second, looping indefinitely
    //     Call endLoops(); if you want to abort next loops and finish

    if ( mySphero.posX > 100 ) {
        mySphero.stop();
        endLoops();
    }

    return;
}
