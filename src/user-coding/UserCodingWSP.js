
// To help parse url location.query easily.  See https://nodejs.org/docs/latest/api/url.html
var url  = require('url');

// Eric class to structure WebSocket processing
var WebSocketProcessor      = require('../WebSocketProcessor');

// Sphero & log events
var SpheroEvents            = require('../sphero/SpheroEvents');
var SE = global.spheroEvents;                   // Replaces jQuery $ events here


// TODO: Global console
//      SE.on("node-user-log", ... send to browser ... )
//      SE.on("node-user-warn", ... send to browser ... )
//      SE.on("node-user-error", ... send to browser ... )

// TODO: search SE.emit and SE.on and JSON.stringify !!!



/** -----------------------------------------------------
 * WebSocketProcessor UserCodingWSP
 * @arg processorName "usercoding" for /ws/usercoding/
 * @arg ws  the websocket object
 */
function UserCodingWSP( ws ) {
    WebSocketProcessor.call( this, "usercoding", ws, false );         // _sendStateListening no {"state":"listening"}

    // this.attr = ...
}

// Inheritance of public methods and setting proper parent relationship. See http://phrogz.net/js/classes/OOPinJS2.html
UserCodingWSP.prototype              = new WebSocketProcessor();
UserCodingWSP.prototype.constructor  = UserCodingWSP;                        // reset the constructor property
UserCodingWSP.prototype.parent       = WebSocketProcessor.prototype;         // keep pointer to ancestor class


/// ======= Now we can override some methods as needed =======

/// Eric method called when websocket is established at the very beginning
UserCodingWSP.prototype.onConnectionEstablished = function() {
    this.parent.onConnectionEstablished.call(this);

    // FIXME global.darkSpheroStudentName not used at all right now
    this.ws.send( JSON.stringify( { "HOC_COLOR": process.env.HOC_COLOR, "darkStudent": global.darkSpheroStudentName } ) );


/*
    var _this = this;
    var closureFuncSendWords = this.closureFuncSendWords = function () {
        _this.sendWords();
    };
    this.sendBestWords();
    AE.on( 'new-words', closureFuncSendWords );
*/
};


UserCodingWSP.prototype.onClose = function(data, flags) {
    this.parent.onClose.call(this, data, flags);

    /// AE.removeListener( 'new-words', this.closureFuncSendWords );
};

UserCodingWSP.prototype.onError = function(data, flags) {
    this.parent.onError.call(this, data, flags);

    ///AE.removeListener( 'new-words', this.closureFuncSendWords );
};




/**
 *  When receiving data
 */
UserCodingWSP.prototype.onMessage = function(data, flags) {
    // flags.binary will be set if a binary data is received.
    // flags.masked will be set if the data was masked.
    if ( flags && flags.binary ) {
        console.log('UserCodingWSP WS received: BINARY length %s', data.length);

        // Nothing to do ???
    }
    else {
        var dataObj = JSON.parse( data );
        if (dataObj.action == "start") {
            // RFU

        }
        else if (dataObj.action == "stop") {
            // Close the server socket
            this.ws.close();
        }
        // ======= Actions from UI buttons =======
        else if (dataObj.action == "push-code") {
            // --- Receiving code for Sphero!
            console.log('\nUserCodingWSP ws PUSH-CODE received: %s', data);
            SE.emit( "push-code", data );

            // TODO: Archive the code  !!

        }
        else if (dataObj.action == "stop-code") {
            // --- Stop the Sphero!
            console.log('\nUserCodingWSP WS STOP-CODE received: %s', data);
            SE.emit( "stop-code", data );
        }
        else if (dataObj.action == "student-sphero-change") {
            // --- Keep track of global.darkSpheroStudentName { studentName: "", isDark: true, wasDark:true }
            console.log('\nUserCodingWSP WS student-sphero-change received: %s', data);
            if (dataObj.isDark) {
                global.darkSpheroStudentName = dataObj.studentName;
                SE.emit("dark-sphero-owner-change", dataObj.studentName);       // TODO
            } else if (dataObj.wasDark) {
                global.darkSpheroStudentName = null;
                SE.emit("dark-sphero-owner-change", "");                        // TODO
            }
        }
        else {
            console.log('\nUserCodingWSP WS received flags: %s', JSON.stringify(flags) );
            console.log('\nUserCodingWSP WS received: %s', data);
        }
    }
};


/** +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 *  Send info to WS socket
 */
UserCodingWSP.prototype.sendBlabla = function()
{
    try {
/*
            this.ws.send( JSON.stringify( blablaObj ) );
*/
    }
    catch (exc) { console.error( "\nTRY-CATCH ERROR in UserCodingWSP.sendBlabla: " + exc.stack + "\n" ); }
    return false;
};


/***
///  /!\ seems never called
UserCodingWSP.prototype.onOpen  = function(data, flags) {};
***/

module.exports = UserCodingWSP;
