
// To help parse url location.query easily.  See https://nodejs.org/docs/latest/api/url.html
var url  = require('url');

// Eric class to structure WebSocket processing
var WebSocketProcessor      = require('../WebSocketProcessor');
// Array utils
var ArrayUtils              = require('../utils/ArrayUtils');

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

    // This triggers the Spheros Dropdown filling, and send the RPi's HOC_COLOR too
    this.ws.send( JSON.stringify( { "action":"initDropdown", "HOC_COLOR": global.RPI_COLOR } ) );

    // --- Establish SE listeners when there is updated info to send to the browser
    var _this = this;
    SE.on('activeSpherosMap', function(){ _this.sendActiveSpherosMap(); } );
    //SE.on('activeSpherosMap', function(_this) { return function(){ _this.sendActiveSpherosMap(); } }(this) );

    SE.on('data-streaming', function(){ _this.sendMySpherosDataMap(); } );


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
        return;
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
            console.log('\nUserCodingWSP ws PUSH-CODE received:');
            console.log( dataObj );
            global.spheroConnectionManager.pushCode( dataObj.macAddress, dataObj.user, dataObj.userCode );

            // TODO: Archive the code  !!

        }
        else if (dataObj.action == "stop-code") {
            // --- Stop the Sphero!
            console.log('\nUserCodingWSP WS STOP-CODE received:');
            console.log( dataObj );
            global.spheroConnectionManager.stopCode( dataObj.macAddress, dataObj.user );
        }
        else if (dataObj.action == "get-spheros") {
            // --- Send the list of active spheros that are available
            console.log('\nUserCodingWSP WS GET-SPHEROS received: %s', data);
            //console.log(global.spheroConnectionManager.activeSpherosMap);

            this.sendActiveSpherosMap();
        }
        else if (dataObj.action == "sphero-selected") {
            // --- Change the user of the selected activeSphero (may fill or empty it)
            // Warning: the only two params that we are supposed to use here are .macAddress and .user
            // .user may be "" (deselect), but .macAddress must be valid
            var activeSphero = dataObj.activeSphero;
            if (!activeSphero || !activeSphero.macAddress) {
                console.error("ERROR in UserCodingWSP.onMessage/sphero-selected: WRONG param activeSphero:");
                console.error( activeSphero );
                return;
            } else {
                // First remove this user from all Spheros (should be at most once)
                if ( activeSphero.user ) {
                    var as = null;
                    do {
                        as = ArrayUtils.findFirstObjectWithPropertyInArray(
                            global.spheroConnectionManager.activeSpherosMap, "user", activeSphero.user );  // array, propertyName, propertyValue )
                        if (as) {
                            as.user = "";
                        }
                    } while ( as );
                }
                // We consider updated names as being from the same user, who has changed her name.
                //      The limitation of not selecting a Sphero already taken is done on the server side.
                //      We don't expect nasty hackers who would like to hijack Spheros from others :-)
                global.spheroConnectionManager.activeSpherosMap[activeSphero.macAddress].user = activeSphero.user;
                // Resend the updated activeSpherosMap
                this.sendActiveSpherosMap();

                // Let's make sure the Sphero is stopped for the new user!

                // TODO: STOP Sphero !!!!!
            }
            SE.emit('user-change', activeSphero);
        }
        else {
            console.log('\nUserCodingWSP WS received flags: %s', JSON.stringify(flags) );
            console.log('\nUserCodingWSP WS received: %s', data);
        }
    }
    return;
};


/** +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 *  Send info to WS socket
 */
UserCodingWSP.prototype.sendActiveSpherosMap = function()
{
     try {
         this.ws.send( JSON.stringify( {
             "action": "activeSpherosMap",
             "activeSpherosMap": global.spheroConnectionManager.activeSpherosMap
         }) );
     }
     catch (exc) { console.error( "\nTRY-CATCH ERROR in UserCodingWSP.sendActiveSpherosMap: " + exc.stack + "\n" ); }
     return;
};

UserCodingWSP.prototype.sendMySpherosDataMap = function()
{
     try {
         this.ws.send( JSON.stringify( {
             "action": "data-streaming",
             "mySpherosDataMap": global.spheroConnectionManager.mySpherosDataMap
         }) );
     }
     catch (exc) { console.error( "\nTRY-CATCH ERROR in UserCodingWSP.sendMySpherosDataMap: " + exc.stack + "\n" ); }
     return;
};



/***
///  /!\ seems never called
UserCodingWSP.prototype.onOpen  = function(data, flags) {};
***/

module.exports = UserCodingWSP;
