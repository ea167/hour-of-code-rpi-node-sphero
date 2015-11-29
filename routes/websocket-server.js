/// var express = require('express');
/// var router = express.Router();
/// var WebServerSocket = require('ws').Server;

// To help parse url location.query easily.  See https://nodejs.org/docs/latest/api/url.html
var url = require('url');

// Eric class to structure WebSocket processing
var WebSocketProcessor  = require('../src/WebSocketProcessor');
// WebSocketProcessor
var UserCodingWSP       = require('../src/user-coding/UserCodingWSP');

/**
 *  Create the right WebSocketProcessor according to the URL called
 */
function _switchOnPathname( ws, wspName )
{
    if (wspName == 'usercoding')
        return new UserCodingWSP( ws );
//    if (wspName == 'texttranscript')
//        return new TextTranscriptWSP( ws );


    // Default pure logger WSP
    return new WebSocketProcessor( "default", ws );
}


function _wspNameFromLocation( location )
{
    var wspName = location.pathname.substring(4);
    var p = wspName.indexOf('/');
    if ( p < 0 )
        return wspName;
    if ( p == 0 )
        return null;
    return wspName.substring(0, p);
}


/*** ==================================================================================
 *  WebServer-Socket connection
 */
 exports.onWsConnection = function ( ws )
 {
     try {
         var location = url.parse( ws.upgradeReq.url, true );   // parseQueryString
         // you might use location.query.access_token to authenticate or share sessions
         // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
         console.log('WebSocket connection on ' + JSON.stringify(location) );

         /// ws is the connected websocket, which is supposed to send audio in our case
         /// Doc here:  https://github.com/websockets/ws/blob/master/doc/ws.md

         /// Switch according to URL
         var wspName = _wspNameFromLocation( location );
         var wsProc  = _switchOnPathname( ws, wspName );

         ws.on('message',    function(data, flags) {
             try { wsProc.onMessage(data, flags); }
             catch (exc) { console.error( "\nTRY-CATCH ERROR in websocket-server onMessage: " + exc.stack + "\n" ); }
         });
         ws.on('open',       function(data, flags) {
             try { wsProc.onOpen(data, flags); }
             catch (exc) { console.error( "\nTRY-CATCH ERROR in websocket-server onOpen: " + exc.stack + "\n" ); }
         });
         ws.on('close',      function(data, flags) {
             try { wsProc.onClose(data, flags); }
             catch (exc) { console.error( "\nTRY-CATCH ERROR in websocket-server onClose: " + exc.stack + "\n" ); }
         });
         ws.on('error',      function(data, flags) {
             try { wsProc.onError(data, flags); }
             catch (exc) { console.error( "\nTRY-CATCH ERROR in websocket-server onError: " + exc.stack + "\n" ); }
         });

         // May send a {"state":"listening"} to the calling socket
         wsProc.onConnectionEstablished();
     }
     catch (exc) {
         console.error( "\nTRY-CATCH ERROR in websocket-server: " + exc.stack + "\n" );
     }
 }

// WARNING: MUST HANDLE SEVERAL SIMULTANEOUS CONNECTIONS, so must INDEX THEM (COUNTER)
// TODO: Check this INDEX was not opened before. INDEX BY SOURCES ideally



/*** Doc

    ERRORS and ACK
            // Errors (both immediate and async write errors) can be detected in an optional
            // callback. The callback is also the only way of being notified that data has
            // actually been sent.
            ws.send('something', function ack(error) {
              // if error is not defined, the send has been completed,
              // otherwise the error object will indicate what failed.
            });
***/
