/**
 *  Handle WebSocket connection from browser to Raspberry Pi
 */
//var $ = require('jquery');

function initBrowserSocket()
{
    var socket;
    var loc = window.location;
    var url = 'ws://'+ loc.hostname+(loc.port ? ':'+loc.port: '') +'/ws/usercoding/'+ (loc.search ? loc.search : ''); // Forward url parameters
    console.log('Socket URL = ', url);

    // --- utils
    var o         = $({});
    $.subscribe   = o.on.bind(o);
    $.unsubscribe = o.off.bind(o);
    $.publish     = o.trigger.bind(o);


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
        var dataObj = JSON.parse( evt.data );
        if (dataObj.error) {
            console.error('ERROR Browser socket.onmessage received error message:');
            console.error( evt );
            /// showError(msg.error);
            $.publish('socketstop');
            return;
        }

        // --- Receives an update of activeSpherosMap
        if (dataObj.type == "activeSpherosMap") {
            activeSpherosMap = dataObj.activeSpherosMap;                 // defined (globally) in the html page
            $.publish('activeSpherosMap');
            return;
        }



        // TODO: Feedback from errors, connected Spheros, code pushed, Sphero stopped, positions, collisions, etc.


         // --- This is the RPi/Sphero color
         if (dataObj.HOC_COLOR) {
             HOC_COLOR = dataObj.HOC_COLOR;             // defined in the html page
             $.publish('hoc_color');
             return;
         }

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
