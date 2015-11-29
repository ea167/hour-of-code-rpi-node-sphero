
// To help parse url location.query easily.  See https://nodejs.org/docs/latest/api/url.html
var url = require('url');


/** -----------------------------------------------------
 * WebSocketProcessor
 * @arg processorName "audio" for /ws/audio/
 * @arg ws  the websocket object
 */
function WebSocketProcessor(wspName, ws, sendStateListening) {
    this.wspName    = wspName;
    this.ws         = ws;
    this.wsUrl      = ws ? url.parse( ws.upgradeReq.url, true ) : null;
    this._sendStateListening = sendStateListening;
}

/// Eric method called when websocket is established at the very beginning
WebSocketProcessor.prototype.onConnectionEstablished = function() {
    if ( this._sendStateListening ) {
        // Send that we are listening
        this.ws.send( JSON.stringify({"state":"listening"}) );
        console.log('WebSocketProcessor CONNECTION [%s] {state:listening} sent', this.wspName);
    } else {
        console.log('WebSocketProcessor CONNECTION [%s] established', this.wspName);
    }
};


/// ----- Default methods
/// When receiving data
WebSocketProcessor.prototype.onMessage = function(data, flags) {
    // flags.binary will be set if a binary data is received.
    // flags.masked will be set if the data was masked.
    if ( flags && flags.binary ) {
        console.log('WS received: BINARY length %s', data.length);
    } else {
        console.log('WS received flags: %s', JSON.stringify(flags) );
        console.log('WS received: %s', data);
    }
};

///  /!\ seems never called
WebSocketProcessor.prototype.onOpen = function(data, flags) {
    console.log('WebSocketProcessor OPEN [%s] received: %s', this.wspName, data);
};

WebSocketProcessor.prototype.onClose = function(data, flags) {
    console.log('WebSocketProcessor CLOSE [%s] received: %s', this.wspName, data);
};

WebSocketProcessor.prototype.onError = function(data, flags) {
    console.log('WebSocketProcessor ERROR [%s] received: %s', this.wspName, data);
};

module.exports = WebSocketProcessor;
