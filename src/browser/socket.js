/**
 *  Handle WebSocket connection from browser to Raspberry Pi
 */
var $ = require('jquery');

function initBrowserSocket()
{
    var socket;
    var loc = window.location;
    var url = 'ws://'+ loc.hostname+(loc.port ? ':'+loc.port: '') +'/ws/usercoding/'+ (loc.search ? loc.search : ''); // Forward url parameters
    console.log('Socket URL = ', url);

    // ----- Open socket
    try {
       socket = new WebSocket(url);
    } catch(exc) {
       console.error('Browser WS connection error: ', exc);
    }

    socket.onopen = function(evt) {
        $.subscribe( 'socketstop', function(data) {
            socket.close();
        });

        // Get the activeSpherosMap
        $.subscribe( 'get-spheros', function(data) {
            socket.send( JSON.stringify(  { "action":"get-spheros" } ) );
        });

        /// socket.send(JSON.stringify(message));
    };


    // ----- on.MESSAGE: Here we get the info!
    socket.onmessage = function(evt) {
        // console.log("socket.onmessage with ");
        // console.log( evt );
        
        var dataObj = JSON.parse( evt.data );
        if (dataObj.error) {
            console.error('ERROR Browser socket.onmessage received error message:');
            console.error( evt );
            /// showError(msg.error);
            $.publish('socketstop');
            return;
        }

        // --- Receives an update of activeSpherosMap
        if (dataObj.action == "activeSpherosMap") {
            activeSpherosMap = dataObj.activeSpherosMap;                 // defined (globally) in the html page
            console.log( "socket.onmessage: activeSpherosMap received" );
            console.log( dataObj.activeSpherosMap );
            $.publish('activeSpherosMap');
            return;
        }

        // --- This triggers the filling of the Sphero Dropdown, and sets the RPi color -
        if (dataObj.action == "initDropdown") {
             HOC_COLOR = dataObj.HOC_COLOR;             // defined in the html page
             $.publish('init_sphero_dropdown');
             return;
        }




        // TODO: Feedback from errors, connected Spheros, code pushed, Sphero stopped, positions, collisions, etc.


        return;
    };


    // --- Error & Closing
    socket.onerror = function(evt) {
        console.error('Browser onerror Server error ' + evt.code + ': please refresh your browser and try again');
        /// showError('Application error ' + evt.code + ': please refresh your browser and try again');
        // TODO ?? Close ?? // $.publish('socketstop');
    };

    socket.onclose = function(evt) {
        console.log('Browser WS onclose: ', evt);
        if (evt.code > 1000) {
             console.error('Browser onclose Server error ' + evt.code + ': please refresh your browser and try again');
             // showError('Server error ' + evt.code + ': please refresh your browser and try again');
             // return false;
        }
        // Made it through, normal close
        $.unsubscribe('socketstop');
    };

    return socket;
}

exports.initBrowserSocket = initBrowserSocket;
