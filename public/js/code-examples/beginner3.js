// --- Define variables used across loops here, if needed
var heading = 0;

/*** Your goal here is to achieve do draw a 8, instead of a circle here ***/

function once( mySphero )
{
    // --- Write code here, that will be executed only once at the beginning

    return;
}


function loop( mySphero )
{
    // --- Write here code that will be run about 2 times per second, looping indefinitely
    //     Call endLoops(); if you want to abort next loops and finish

    mySphero.roll( 30, heading );

    heading += 20;

    if ( heading > 360 ) {
        heading = 0;
    }
    return;
}
