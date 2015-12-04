
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

    this.startDate = (this.wsUrl.query.startDate ? new Date( this.wsUrl.query.startDate ) : null);
    this.endDate   = (this.wsUrl.query.endDate   ? new Date( this.wsUrl.query.endDate )   : null);
}

// Inheritance of public methods and setting proper parent relationship. See http://phrogz.net/js/classes/OOPinJS2.html
UserCodingWSP.prototype              = new WebSocketProcessor();
UserCodingWSP.prototype.constructor  = UserCodingWSP;                        // reset the constructor property
UserCodingWSP.prototype.parent       = WebSocketProcessor.prototype;         // keep pointer to ancestor class


/// ======= Now we can override some methods as needed =======

/// Eric method called when websocket is established at the very beginning
UserCodingWSP.prototype.onConnectionEstablished = function() {
    this.parent.onConnectionEstablished.call(this);

/*  FIXME
    var _this = this;
    var closureFuncSendBestWords = this.closureFuncSendBestWords = function () {
        _this.sendBestWords();
    };
    this.sendBestWords();
    AE.on( 'new-cloud-words', closureFuncSendBestWords );
*/
};


UserCodingWSP.prototype.onClose = function(data, flags) {
    this.parent.onClose.call(this, data, flags);

    /// AE.removeListener( 'new-cloud-words', this.closureFuncSendBestWords );
};

UserCodingWSP.prototype.onError = function(data, flags) {
    this.parent.onError.call(this, data, flags);

    ///AE.removeListener( 'new-cloud-words', this.closureFuncSendBestWords );
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
        console.log('UserCodingWSP WS received flags: %s', JSON.stringify(flags) );
        console.log('UserCodingWSP WS received: %s', data);
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
            SE.emit("push-code", data );

            // TODO: Archive the code  !!

        }
        else if (dataObj.action == "stop-code") {
            // --- Stop the Sphero!
            SE.emit("stop-code", data );
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
        var bestWords = (this.startDate || this.endDate)
            ? global.eveniumGlobalResults.getBestWordsInBetween(this.startDate, this.endDate)
            : global.eveniumGlobalResults.bestWords;

        if ( bestWords ) {
            this.ws.send( JSON.stringify( bestWords.cloudBestWords ) );
            return true;
        }
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
