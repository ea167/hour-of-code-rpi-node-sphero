(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/**
 *  Handle the clicks on the example buttons and the loading of the code in the JS editor
 */
var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

// Array of ids
var EXAMPLE_CODE_IDS = [
    "beginner1", "beginner2", "beginner3", "beginner4", "beginner5",
    "advanced1", "advanced2", "advanced3"
];

// Key = html id, Value = text of the code
var EXAMPLE_CODES = [];

// The one currently displayed in the example zone (may be null)
var currentExampleCodeIdDisplayed;

/**
 *
 */
function initExamplesButtons()
{
    // For all examples
    for (var i = 0; i < EXAMPLE_CODE_IDS.length; i++ ) {
        var exampleId = EXAMPLE_CODE_IDS[i];

        // --- Download the example as ajax and store it as associative array
        downloadExampleCode( exampleId );

        // --- Add listeners
        $("#"+exampleId).on("click", function() { showExampleArea(exampleId); });
    }

    // --- Bind the hide / edit code buttons

    // TODO

    return;
}


// --- Download all examples locally through ajax
function downloadExampleCode( exampleId )
{

}

// --- Show the code in the example area,
function showExampleArea( exampleId )
{
    currentExampleCodeIdDisplayed = exampleId;

    // Set div content + show div

}

// TODO: Bind on the buttons to display the examples and copy the code to the editor

// TODO: Button to copy code to the editor

exports.initExamplesButtons = initExamplesButtons;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
'use strict';

// Global WebSocket from the browser to the RPi, which handles bi-dir communications. Defined in the webpage.
// var browserWebSocket = null;

// ===== Modules Required =====
var initBrowserSocket   = require('./socket').initBrowserSocket;
var initEditorButtons   = require('./js-editor').initEditorButtons;
var initExamplesButtons = require('./example-buttons').initExamplesButtons;

// ===== Start of the main page =====
$(document).ready( function() {

    // --- Initialize all the views
    // initViews();

    // --- Start the WebSocket between the browser and the RPi
    browserWebSocket = initBrowserSocket();

    // --- Init the behaviour of buttons for the JS editor
    initEditorButtons();
    //
    initExamplesButtons();

});


// Save models to localstorage
// localStorage.setItem('toto', JSON.stringify("toto"));

//$.subscribe('resetscreen', function() {
//  $('#result').text('');
//  $('.error-row').hide();
//});

},{"./example-buttons":1,"./js-editor":3,"./socket":4}],3:[function(require,module,exports){
(function (global){
/**
 *  Manages the JS editor (CodeMirror in this project)
 */
var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

// To avoid double-clicks
var lastClickOnPushToSphero     = null;
var lastClickOnStopSphero       = null;
// To avoid duplicate saves
var lastContentSaveEditorGeneration = null;


function initEditorButtons()
{
    // Listeners
    $("#push_to_sphero").on("click", pushToSpheroOnClick );                      // function() { pushToSpheroOnClick( browserWebSocket); });
    $("#stop_sphero").on("click",    stopSpheroOnClick );

    // Interval to record code history, when there are changes, in local storage,
    //  every minute at most, keep the last 50 max of codes posted (they should be stored on RPi)
    setInterval( saveCodeEveryMinuteToLocalStorage, 60000 );
    return;
}


/**
 *
 */
function pushToSpheroOnClick()
{
    var now = Date.now();
    if ( lastClickOnPushToSphero && (now - lastClickOnPushToSphero) < 5000 ) {
        console.log( "pushToSpheroOnClick clicked twice within 5 seconds. Ignoring!" );
        return;
    }
    lastClickOnPushToSphero = now;

    // --- Transfer the CODE to RPi
    var userCode = codeMirrorEditor.getValue();                                     // codeMirrorEditor global var
    //
    //  FIXME: spheroIndex !!!! FIXME !!!!
    var myIndex = 0;
    //
    browserWebSocket.send( JSON.stringify( { "action": "push-code", "spheroIndex": myIndex , "userCode": userCode } ));  // browserWebSocket global var

    // --- Save userCode to localStorage
    saveCodeToLocalStorage( userCode );
    return;
}


/**
 *
 */
function stopSpheroOnClick()
{
    var now = Date.now();
    if ( lastClickOnStopSphero && (now - lastClickOnStopSphero) < 5000 ) {
        console.log( "pushToSpheroOnClick clicked twice within 5 seconds. Ignoring!" );
        return;
    }
    lastClickOnStopSphero = now;

    //  FIXME: spheroIndex !!!! FIXME !!!!
    var myIndex = 0;
    //

    // --- Transfer the STOP command to RPi
    browserWebSocket.send( JSON.stringify( { "action":"stop-code", "spheroIndex": myIndex } ));         // browserWebSocket global var
    return;
}


/**
 *
 */
function saveCodeEveryMinuteToLocalStorage()
{
    if ( lastContentSaveEditorGeneration && codeMirrorEditor.isClean( lastContentSaveEditorGeneration ) ) {
        // No need to save, no changes
        return;
    }
    // Otw save to localStorage
    var userCode = codeMirrorEditor.getValue();                                     // codeMirrorEditor global var
    saveCodeToLocalStorage( userCode );
}


/**
 *
 */
function saveCodeToLocalStorage( userCode )
{
    var itemName = "code-" + Date.now();
    // --- Save userCode to localStorage
    localStorage.setItem( itemName, JSON.stringify(userCode) );
    var codeList = localStorage.getItem("codeList");
    codeList = ( codeList ) ? JSON.parse( codeList ) : [];
    codeList.push( itemName );
    if (codeList.length > 50) {             // Prevent it from getting too big!
        var firstItemName = codeList.shift();
        localStorage.removeItem( firstItemName );
    }
    localStorage.setItem( "codeList", JSON.stringify(codeList) );
    // Keep track of the save
    lastContentSaveEditorGeneration = codeMirrorEditor.changeGeneration();
    return;
}


exports.initEditorButtons = initEditorButtons;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
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


   // --- Open socket
   try {
       socket = new WebSocket(url);
   } catch(exc) {
       console.error('Browser WS connection error: ', exc);
   }

   socket.onopen = function(evt) {
       $.subscribe('socketstop', function(data) {
           socket.close();
       });
       /// socket.send(JSON.stringify(message));
   };


     // ------- Here we get the info!
     socket.onmessage = function(evt) {
         var dataObj = JSON.parse( evt.data );
         if (dataObj.error) {
             /// showError(msg.error);
             $.publish('socketstop');
             return;
         }
         // --- This is the new best words array
         // FIXME
         var jsonBrowser = dataObj;
         if (jsonBrowser) {
             if (jsonBrowser.results[0].final) {
                 // global function
                 updateFinalBrowser( jsonBrowser );
             } else {
                 // global function
                 updateInterimBrowser( jsonBrowser );
             }
         }
         else {
             console.error('Browser onmessage jsonBrowser EMPTY ', evt);
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvZXhhbXBsZS1idXR0b25zLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9qcy1lZGl0b3IuanMiLCJzcmMvYnJvd3Nlci9zb2NrZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogIEhhbmRsZSB0aGUgY2xpY2tzIG9uIHRoZSBleGFtcGxlIGJ1dHRvbnMgYW5kIHRoZSBsb2FkaW5nIG9mIHRoZSBjb2RlIGluIHRoZSBKUyBlZGl0b3JcbiAqL1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpO1xuXG4vLyBBcnJheSBvZiBpZHNcbnZhciBFWEFNUExFX0NPREVfSURTID0gW1xuICAgIFwiYmVnaW5uZXIxXCIsIFwiYmVnaW5uZXIyXCIsIFwiYmVnaW5uZXIzXCIsIFwiYmVnaW5uZXI0XCIsIFwiYmVnaW5uZXI1XCIsXG4gICAgXCJhZHZhbmNlZDFcIiwgXCJhZHZhbmNlZDJcIiwgXCJhZHZhbmNlZDNcIlxuXTtcblxuLy8gS2V5ID0gaHRtbCBpZCwgVmFsdWUgPSB0ZXh0IG9mIHRoZSBjb2RlXG52YXIgRVhBTVBMRV9DT0RFUyA9IFtdO1xuXG4vLyBUaGUgb25lIGN1cnJlbnRseSBkaXNwbGF5ZWQgaW4gdGhlIGV4YW1wbGUgem9uZSAobWF5IGJlIG51bGwpXG52YXIgY3VycmVudEV4YW1wbGVDb2RlSWREaXNwbGF5ZWQ7XG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gaW5pdEV4YW1wbGVzQnV0dG9ucygpXG57XG4gICAgLy8gRm9yIGFsbCBleGFtcGxlc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgRVhBTVBMRV9DT0RFX0lEUy5sZW5ndGg7IGkrKyApIHtcbiAgICAgICAgdmFyIGV4YW1wbGVJZCA9IEVYQU1QTEVfQ09ERV9JRFNbaV07XG5cbiAgICAgICAgLy8gLS0tIERvd25sb2FkIHRoZSBleGFtcGxlIGFzIGFqYXggYW5kIHN0b3JlIGl0IGFzIGFzc29jaWF0aXZlIGFycmF5XG4gICAgICAgIGRvd25sb2FkRXhhbXBsZUNvZGUoIGV4YW1wbGVJZCApO1xuXG4gICAgICAgIC8vIC0tLSBBZGQgbGlzdGVuZXJzXG4gICAgICAgICQoXCIjXCIrZXhhbXBsZUlkKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBzaG93RXhhbXBsZUFyZWEoZXhhbXBsZUlkKTsgfSk7XG4gICAgfVxuXG4gICAgLy8gLS0tIEJpbmQgdGhlIGhpZGUgLyBlZGl0IGNvZGUgYnV0dG9uc1xuXG4gICAgLy8gVE9ET1xuXG4gICAgcmV0dXJuO1xufVxuXG5cbi8vIC0tLSBEb3dubG9hZCBhbGwgZXhhbXBsZXMgbG9jYWxseSB0aHJvdWdoIGFqYXhcbmZ1bmN0aW9uIGRvd25sb2FkRXhhbXBsZUNvZGUoIGV4YW1wbGVJZCApXG57XG5cbn1cblxuLy8gLS0tIFNob3cgdGhlIGNvZGUgaW4gdGhlIGV4YW1wbGUgYXJlYSxcbmZ1bmN0aW9uIHNob3dFeGFtcGxlQXJlYSggZXhhbXBsZUlkIClcbntcbiAgICBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZCA9IGV4YW1wbGVJZDtcblxuICAgIC8vIFNldCBkaXYgY29udGVudCArIHNob3cgZGl2XG5cbn1cblxuLy8gVE9ETzogQmluZCBvbiB0aGUgYnV0dG9ucyB0byBkaXNwbGF5IHRoZSBleGFtcGxlcyBhbmQgY29weSB0aGUgY29kZSB0byB0aGUgZWRpdG9yXG5cbi8vIFRPRE86IEJ1dHRvbiB0byBjb3B5IGNvZGUgdG8gdGhlIGVkaXRvclxuXG5leHBvcnRzLmluaXRFeGFtcGxlc0J1dHRvbnMgPSBpbml0RXhhbXBsZXNCdXR0b25zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBHbG9iYWwgV2ViU29ja2V0IGZyb20gdGhlIGJyb3dzZXIgdG8gdGhlIFJQaSwgd2hpY2ggaGFuZGxlcyBiaS1kaXIgY29tbXVuaWNhdGlvbnMuIERlZmluZWQgaW4gdGhlIHdlYnBhZ2UuXG4vLyB2YXIgYnJvd3NlcldlYlNvY2tldCA9IG51bGw7XG5cbi8vID09PT09IE1vZHVsZXMgUmVxdWlyZWQgPT09PT1cbnZhciBpbml0QnJvd3NlclNvY2tldCAgID0gcmVxdWlyZSgnLi9zb2NrZXQnKS5pbml0QnJvd3NlclNvY2tldDtcbnZhciBpbml0RWRpdG9yQnV0dG9ucyAgID0gcmVxdWlyZSgnLi9qcy1lZGl0b3InKS5pbml0RWRpdG9yQnV0dG9ucztcbnZhciBpbml0RXhhbXBsZXNCdXR0b25zID0gcmVxdWlyZSgnLi9leGFtcGxlLWJ1dHRvbnMnKS5pbml0RXhhbXBsZXNCdXR0b25zO1xuXG4vLyA9PT09PSBTdGFydCBvZiB0aGUgbWFpbiBwYWdlID09PT09XG4kKGRvY3VtZW50KS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cbiAgICAvLyAtLS0gSW5pdGlhbGl6ZSBhbGwgdGhlIHZpZXdzXG4gICAgLy8gaW5pdFZpZXdzKCk7XG5cbiAgICAvLyAtLS0gU3RhcnQgdGhlIFdlYlNvY2tldCBiZXR3ZWVuIHRoZSBicm93c2VyIGFuZCB0aGUgUlBpXG4gICAgYnJvd3NlcldlYlNvY2tldCA9IGluaXRCcm93c2VyU29ja2V0KCk7XG5cbiAgICAvLyAtLS0gSW5pdCB0aGUgYmVoYXZpb3VyIG9mIGJ1dHRvbnMgZm9yIHRoZSBKUyBlZGl0b3JcbiAgICBpbml0RWRpdG9yQnV0dG9ucygpO1xuICAgIC8vXG4gICAgaW5pdEV4YW1wbGVzQnV0dG9ucygpO1xuXG59KTtcblxuXG4vLyBTYXZlIG1vZGVscyB0byBsb2NhbHN0b3JhZ2Vcbi8vIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd0b3RvJywgSlNPTi5zdHJpbmdpZnkoXCJ0b3RvXCIpKTtcblxuLy8kLnN1YnNjcmliZSgncmVzZXRzY3JlZW4nLCBmdW5jdGlvbigpIHtcbi8vICAkKCcjcmVzdWx0JykudGV4dCgnJyk7XG4vLyAgJCgnLmVycm9yLXJvdycpLmhpZGUoKTtcbi8vfSk7XG4iLCIvKipcbiAqICBNYW5hZ2VzIHRoZSBKUyBlZGl0b3IgKENvZGVNaXJyb3IgaW4gdGhpcyBwcm9qZWN0KVxuICovXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCk7XG5cbi8vIFRvIGF2b2lkIGRvdWJsZS1jbGlja3NcbnZhciBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyAgICAgPSBudWxsO1xudmFyIGxhc3RDbGlja09uU3RvcFNwaGVybyAgICAgICA9IG51bGw7XG4vLyBUbyBhdm9pZCBkdXBsaWNhdGUgc2F2ZXNcbnZhciBsYXN0Q29udGVudFNhdmVFZGl0b3JHZW5lcmF0aW9uID0gbnVsbDtcblxuXG5mdW5jdGlvbiBpbml0RWRpdG9yQnV0dG9ucygpXG57XG4gICAgLy8gTGlzdGVuZXJzXG4gICAgJChcIiNwdXNoX3RvX3NwaGVyb1wiKS5vbihcImNsaWNrXCIsIHB1c2hUb1NwaGVyb09uQ2xpY2sgKTsgICAgICAgICAgICAgICAgICAgICAgLy8gZnVuY3Rpb24oKSB7IHB1c2hUb1NwaGVyb09uQ2xpY2soIGJyb3dzZXJXZWJTb2NrZXQpOyB9KTtcbiAgICAkKFwiI3N0b3Bfc3BoZXJvXCIpLm9uKFwiY2xpY2tcIiwgICAgc3RvcFNwaGVyb09uQ2xpY2sgKTtcblxuICAgIC8vIEludGVydmFsIHRvIHJlY29yZCBjb2RlIGhpc3RvcnksIHdoZW4gdGhlcmUgYXJlIGNoYW5nZXMsIGluIGxvY2FsIHN0b3JhZ2UsXG4gICAgLy8gIGV2ZXJ5IG1pbnV0ZSBhdCBtb3N0LCBrZWVwIHRoZSBsYXN0IDUwIG1heCBvZiBjb2RlcyBwb3N0ZWQgKHRoZXkgc2hvdWxkIGJlIHN0b3JlZCBvbiBSUGkpXG4gICAgc2V0SW50ZXJ2YWwoIHNhdmVDb2RlRXZlcnlNaW51dGVUb0xvY2FsU3RvcmFnZSwgNjAwMDAgKTtcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBwdXNoVG9TcGhlcm9PbkNsaWNrKClcbntcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoIGxhc3RDbGlja09uUHVzaFRvU3BoZXJvICYmIChub3cgLSBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybykgPCA1MDAwICkge1xuICAgICAgICBjb25zb2xlLmxvZyggXCJwdXNoVG9TcGhlcm9PbkNsaWNrIGNsaWNrZWQgdHdpY2Ugd2l0aGluIDUgc2Vjb25kcy4gSWdub3JpbmchXCIgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyA9IG5vdztcblxuICAgIC8vIC0tLSBUcmFuc2ZlciB0aGUgQ09ERSB0byBSUGlcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIC8vXG4gICAgLy8gIEZJWE1FOiBzcGhlcm9JbmRleCAhISEhIEZJWE1FICEhISFcbiAgICB2YXIgbXlJbmRleCA9IDA7XG4gICAgLy9cbiAgICBicm93c2VyV2ViU29ja2V0LnNlbmQoIEpTT04uc3RyaW5naWZ5KCB7IFwiYWN0aW9uXCI6IFwicHVzaC1jb2RlXCIsIFwic3BoZXJvSW5kZXhcIjogbXlJbmRleCAsIFwidXNlckNvZGVcIjogdXNlckNvZGUgfSApKTsgIC8vIGJyb3dzZXJXZWJTb2NrZXQgZ2xvYmFsIHZhclxuXG4gICAgLy8gLS0tIFNhdmUgdXNlckNvZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZSggdXNlckNvZGUgKTtcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzdG9wU3BoZXJvT25DbGljaygpXG57XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgaWYgKCBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gJiYgKG5vdyAtIGxhc3RDbGlja09uU3RvcFNwaGVybykgPCA1MDAwICkge1xuICAgICAgICBjb25zb2xlLmxvZyggXCJwdXNoVG9TcGhlcm9PbkNsaWNrIGNsaWNrZWQgdHdpY2Ugd2l0aGluIDUgc2Vjb25kcy4gSWdub3JpbmchXCIgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gPSBub3c7XG5cbiAgICAvLyAgRklYTUU6IHNwaGVyb0luZGV4ICEhISEgRklYTUUgISEhIVxuICAgIHZhciBteUluZGV4ID0gMDtcbiAgICAvL1xuXG4gICAgLy8gLS0tIFRyYW5zZmVyIHRoZSBTVE9QIGNvbW1hbmQgdG8gUlBpXG4gICAgYnJvd3NlcldlYlNvY2tldC5zZW5kKCBKU09OLnN0cmluZ2lmeSggeyBcImFjdGlvblwiOlwic3RvcC1jb2RlXCIsIFwic3BoZXJvSW5kZXhcIjogbXlJbmRleCB9ICkpOyAgICAgICAgIC8vIGJyb3dzZXJXZWJTb2NrZXQgZ2xvYmFsIHZhclxuICAgIHJldHVybjtcbn1cblxuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIHNhdmVDb2RlRXZlcnlNaW51dGVUb0xvY2FsU3RvcmFnZSgpXG57XG4gICAgaWYgKCBsYXN0Q29udGVudFNhdmVFZGl0b3JHZW5lcmF0aW9uICYmIGNvZGVNaXJyb3JFZGl0b3IuaXNDbGVhbiggbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiApICkge1xuICAgICAgICAvLyBObyBuZWVkIHRvIHNhdmUsIG5vIGNoYW5nZXNcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBPdHcgc2F2ZSB0byBsb2NhbFN0b3JhZ2VcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlKCB1c2VyQ29kZSApXG57XG4gICAgdmFyIGl0ZW1OYW1lID0gXCJjb2RlLVwiICsgRGF0ZS5ub3coKTtcbiAgICAvLyAtLS0gU2F2ZSB1c2VyQ29kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggaXRlbU5hbWUsIEpTT04uc3RyaW5naWZ5KHVzZXJDb2RlKSApO1xuICAgIHZhciBjb2RlTGlzdCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29kZUxpc3RcIik7XG4gICAgY29kZUxpc3QgPSAoIGNvZGVMaXN0ICkgPyBKU09OLnBhcnNlKCBjb2RlTGlzdCApIDogW107XG4gICAgY29kZUxpc3QucHVzaCggaXRlbU5hbWUgKTtcbiAgICBpZiAoY29kZUxpc3QubGVuZ3RoID4gNTApIHsgICAgICAgICAgICAgLy8gUHJldmVudCBpdCBmcm9tIGdldHRpbmcgdG9vIGJpZyFcbiAgICAgICAgdmFyIGZpcnN0SXRlbU5hbWUgPSBjb2RlTGlzdC5zaGlmdCgpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSggZmlyc3RJdGVtTmFtZSApO1xuICAgIH1cbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggXCJjb2RlTGlzdFwiLCBKU09OLnN0cmluZ2lmeShjb2RlTGlzdCkgKTtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBzYXZlXG4gICAgbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiA9IGNvZGVNaXJyb3JFZGl0b3IuY2hhbmdlR2VuZXJhdGlvbigpO1xuICAgIHJldHVybjtcbn1cblxuXG5leHBvcnRzLmluaXRFZGl0b3JCdXR0b25zID0gaW5pdEVkaXRvckJ1dHRvbnM7XG4iLCIvKipcbiAqICBIYW5kbGUgV2ViU29ja2V0IGNvbm5lY3Rpb24gZnJvbSBicm93c2VyIHRvIFJhc3BiZXJyeSBQaVxuICovXG4vL3ZhciAkID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG5cbmZ1bmN0aW9uIGluaXRCcm93c2VyU29ja2V0KClcbntcbiAgIHZhciBzb2NrZXQ7XG4gICB2YXIgbG9jID0gd2luZG93LmxvY2F0aW9uO1xuICAgdmFyIHVybCA9ICd3czovLycrIGxvYy5ob3N0bmFtZSsobG9jLnBvcnQgPyAnOicrbG9jLnBvcnQ6ICcnKSArJy93cy91c2VyY29kaW5nLycrIChsb2Muc2VhcmNoID8gbG9jLnNlYXJjaCA6ICcnKTsgLy8gRm9yd2FyZCB1cmwgcGFyYW1ldGVyc1xuICAgY29uc29sZS5sb2coJ1NvY2tldCBVUkwgPSAnLCB1cmwpO1xuXG4gICAvLyAtLS0gdXRpbHNcbiAgIHZhciBvICAgICAgICAgPSAkKHt9KTtcbiAgICQuc3Vic2NyaWJlICAgPSBvLm9uLmJpbmQobyk7XG4gICAkLnVuc3Vic2NyaWJlID0gby5vZmYuYmluZChvKTtcbiAgICQucHVibGlzaCAgICAgPSBvLnRyaWdnZXIuYmluZChvKTtcblxuXG4gICAvLyAtLS0gT3BlbiBzb2NrZXRcbiAgIHRyeSB7XG4gICAgICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldCh1cmwpO1xuICAgfSBjYXRjaChleGMpIHtcbiAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIFdTIGNvbm5lY3Rpb24gZXJyb3I6ICcsIGV4Yyk7XG4gICB9XG5cbiAgIHNvY2tldC5vbm9wZW4gPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAkLnN1YnNjcmliZSgnc29ja2V0c3RvcCcsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgc29ja2V0LmNsb3NlKCk7XG4gICAgICAgfSk7XG4gICAgICAgLy8vIHNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKTtcbiAgIH07XG5cblxuICAgICAvLyAtLS0tLS0tIEhlcmUgd2UgZ2V0IHRoZSBpbmZvIVxuICAgICBzb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICB2YXIgZGF0YU9iaiA9IEpTT04ucGFyc2UoIGV2dC5kYXRhICk7XG4gICAgICAgICBpZiAoZGF0YU9iai5lcnJvcikge1xuICAgICAgICAgICAgIC8vLyBzaG93RXJyb3IobXNnLmVycm9yKTtcbiAgICAgICAgICAgICAkLnB1Ymxpc2goJ3NvY2tldHN0b3AnKTtcbiAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICB9XG4gICAgICAgICAvLyAtLS0gVGhpcyBpcyB0aGUgbmV3IGJlc3Qgd29yZHMgYXJyYXlcbiAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICB2YXIganNvbkJyb3dzZXIgPSBkYXRhT2JqO1xuICAgICAgICAgaWYgKGpzb25Ccm93c2VyKSB7XG4gICAgICAgICAgICAgaWYgKGpzb25Ccm93c2VyLnJlc3VsdHNbMF0uZmluYWwpIHtcbiAgICAgICAgICAgICAgICAgLy8gZ2xvYmFsIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgIHVwZGF0ZUZpbmFsQnJvd3NlcigganNvbkJyb3dzZXIgKTtcbiAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAvLyBnbG9iYWwgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgdXBkYXRlSW50ZXJpbUJyb3dzZXIoIGpzb25Ccm93c2VyICk7XG4gICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbm1lc3NhZ2UganNvbkJyb3dzZXIgRU1QVFkgJywgZXZ0KTtcbiAgICAgICAgIH1cbiAgICAgICAgIHJldHVybjtcbiAgICAgfTtcblxuXG4gICAgIC8vIC0tLSBFcnJvciAmIENsb3NpbmdcbiAgICAgc29ja2V0Lm9uZXJyb3IgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgb25lcnJvciBTZXJ2ZXIgZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgIC8vLyBzaG93RXJyb3IoJ0FwcGxpY2F0aW9uIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAvLyBUT0RPID8/IENsb3NlID8/IC8vICQucHVibGlzaCgnc29ja2V0c3RvcCcpO1xuICAgICB9O1xuXG4gICAgIHNvY2tldC5vbmNsb3NlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnQnJvd3NlciBXUyBvbmNsb3NlOiAnLCBldnQpO1xuICAgICAgICAgaWYgKGV2dC5jb2RlID4gMTAwMCkge1xuICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgb25jbG9zZSBTZXJ2ZXIgZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgICAgICAvLyBzaG93RXJyb3IoJ1NlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgICAgIC8vIHJldHVybiBmYWxzZTtcbiAgICAgICAgIH1cbiAgICAgICAgIC8vIE1hZGUgaXQgdGhyb3VnaCwgbm9ybWFsIGNsb3NlXG4gICAgICAgICAkLnVuc3Vic2NyaWJlKCdzb2NrZXRzdG9wJyk7XG4gICAgIH07XG5cbiAgICAgcmV0dXJuIHNvY2tldDtcbn1cblxuZXhwb3J0cy5pbml0QnJvd3NlclNvY2tldCA9IGluaXRCcm93c2VyU29ja2V0O1xuIl19
