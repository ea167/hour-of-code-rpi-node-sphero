(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/**
 *  Handle the clicks on the example buttons and the loading of the code in the JS editor
 */
var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

var saveCodeToLocalStorage = require("./js-editor").saveCodeToLocalStorage;

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
    downloadExampleCode( "default" );

    // For all examples
    for (var i = 0; i < EXAMPLE_CODE_IDS.length; i++ ) {
        var exampleId = EXAMPLE_CODE_IDS[i];

        // --- Download the example as ajax and store it as associative array
        downloadExampleCode( exampleId );

        // --- Add listeners
        $("#"+exampleId).on("click", function(exId) {
            return function() { showExampleArea(exId); }
        }(exampleId) );               // Otw keeps the latest value of exampleId
    }

    // --- Bind the hide / edit code buttons
    $("#hide_example_zone").on("click", function() { $("#example_zone").hide( 300 ); });   // ms

    $("#put_example_in_editor").on("click", function() { transferExampleCodeToEditor(); });
    return;
}


// --- Download all examples locally through ajax
function downloadExampleCode( exampleId )
{
    // Download and Save it
    $.get('/js/code-examples/'+ exampleId +'.js', function( data ) {
        EXAMPLE_CODES[ exampleId ] = data;
    });
}


// --- Show the code in the example area
function showExampleArea( exampleId )
{
    currentExampleCodeIdDisplayed = exampleId;
    // Set div content + show div
    $("#example_code").html( EXAMPLE_CODES[ exampleId ] );
    $("#example_zone").show( 400 );  // ms
}


// --- Transfer the code to the editor
function transferExampleCodeToEditor()
{
    // Save current code!
    var userCode = codeMirrorEditor.getValue();                                     // codeMirrorEditor global var
    saveCodeToLocalStorage( userCode );

    // Hide the example zone
    $("#example_zone").hide( 300 );

    // Transfer in editor 
    codeMirrorEditor.setValue( EXAMPLE_CODES[ currentExampleCodeIdDisplayed ].toString() );
}


exports.initExamplesButtons = initExamplesButtons;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./js-editor":3}],2:[function(require,module,exports){
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
exports.saveCodeToLocalStorage = saveCodeToLocalStorage;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvZXhhbXBsZS1idXR0b25zLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9qcy1lZGl0b3IuanMiLCJzcmMvYnJvd3Nlci9zb2NrZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqICBIYW5kbGUgdGhlIGNsaWNrcyBvbiB0aGUgZXhhbXBsZSBidXR0b25zIGFuZCB0aGUgbG9hZGluZyBvZiB0aGUgY29kZSBpbiB0aGUgSlMgZWRpdG9yXG4gKi9cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKTtcblxudmFyIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UgPSByZXF1aXJlKFwiLi9qcy1lZGl0b3JcIikuc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZTtcblxuLy8gQXJyYXkgb2YgaWRzXG52YXIgRVhBTVBMRV9DT0RFX0lEUyA9IFtcbiAgICBcImJlZ2lubmVyMVwiLCBcImJlZ2lubmVyMlwiLCBcImJlZ2lubmVyM1wiLCBcImJlZ2lubmVyNFwiLCBcImJlZ2lubmVyNVwiLFxuICAgIFwiYWR2YW5jZWQxXCIsIFwiYWR2YW5jZWQyXCIsIFwiYWR2YW5jZWQzXCJcbl07XG5cbi8vIEtleSA9IGh0bWwgaWQsIFZhbHVlID0gdGV4dCBvZiB0aGUgY29kZVxudmFyIEVYQU1QTEVfQ09ERVMgPSBbXTtcblxuLy8gVGhlIG9uZSBjdXJyZW50bHkgZGlzcGxheWVkIGluIHRoZSBleGFtcGxlIHpvbmUgKG1heSBiZSBudWxsKVxudmFyIGN1cnJlbnRFeGFtcGxlQ29kZUlkRGlzcGxheWVkO1xuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIGluaXRFeGFtcGxlc0J1dHRvbnMoKVxue1xuICAgIGRvd25sb2FkRXhhbXBsZUNvZGUoIFwiZGVmYXVsdFwiICk7XG5cbiAgICAvLyBGb3IgYWxsIGV4YW1wbGVzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBFWEFNUExFX0NPREVfSURTLmxlbmd0aDsgaSsrICkge1xuICAgICAgICB2YXIgZXhhbXBsZUlkID0gRVhBTVBMRV9DT0RFX0lEU1tpXTtcblxuICAgICAgICAvLyAtLS0gRG93bmxvYWQgdGhlIGV4YW1wbGUgYXMgYWpheCBhbmQgc3RvcmUgaXQgYXMgYXNzb2NpYXRpdmUgYXJyYXlcbiAgICAgICAgZG93bmxvYWRFeGFtcGxlQ29kZSggZXhhbXBsZUlkICk7XG5cbiAgICAgICAgLy8gLS0tIEFkZCBsaXN0ZW5lcnNcbiAgICAgICAgJChcIiNcIitleGFtcGxlSWQpLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZXhJZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyBzaG93RXhhbXBsZUFyZWEoZXhJZCk7IH1cbiAgICAgICAgfShleGFtcGxlSWQpICk7ICAgICAgICAgICAgICAgLy8gT3R3IGtlZXBzIHRoZSBsYXRlc3QgdmFsdWUgb2YgZXhhbXBsZUlkXG4gICAgfVxuXG4gICAgLy8gLS0tIEJpbmQgdGhlIGhpZGUgLyBlZGl0IGNvZGUgYnV0dG9uc1xuICAgICQoXCIjaGlkZV9leGFtcGxlX3pvbmVcIikub24oXCJjbGlja1wiLCBmdW5jdGlvbigpIHsgJChcIiNleGFtcGxlX3pvbmVcIikuaGlkZSggMzAwICk7IH0pOyAgIC8vIG1zXG5cbiAgICAkKFwiI3B1dF9leGFtcGxlX2luX2VkaXRvclwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB0cmFuc2ZlckV4YW1wbGVDb2RlVG9FZGl0b3IoKTsgfSk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8vIC0tLSBEb3dubG9hZCBhbGwgZXhhbXBsZXMgbG9jYWxseSB0aHJvdWdoIGFqYXhcbmZ1bmN0aW9uIGRvd25sb2FkRXhhbXBsZUNvZGUoIGV4YW1wbGVJZCApXG57XG4gICAgLy8gRG93bmxvYWQgYW5kIFNhdmUgaXRcbiAgICAkLmdldCgnL2pzL2NvZGUtZXhhbXBsZXMvJysgZXhhbXBsZUlkICsnLmpzJywgZnVuY3Rpb24oIGRhdGEgKSB7XG4gICAgICAgIEVYQU1QTEVfQ09ERVNbIGV4YW1wbGVJZCBdID0gZGF0YTtcbiAgICB9KTtcbn1cblxuXG4vLyAtLS0gU2hvdyB0aGUgY29kZSBpbiB0aGUgZXhhbXBsZSBhcmVhXG5mdW5jdGlvbiBzaG93RXhhbXBsZUFyZWEoIGV4YW1wbGVJZCApXG57XG4gICAgY3VycmVudEV4YW1wbGVDb2RlSWREaXNwbGF5ZWQgPSBleGFtcGxlSWQ7XG4gICAgLy8gU2V0IGRpdiBjb250ZW50ICsgc2hvdyBkaXZcbiAgICAkKFwiI2V4YW1wbGVfY29kZVwiKS5odG1sKCBFWEFNUExFX0NPREVTWyBleGFtcGxlSWQgXSApO1xuICAgICQoXCIjZXhhbXBsZV96b25lXCIpLnNob3coIDQwMCApOyAgLy8gbXNcbn1cblxuXG4vLyAtLS0gVHJhbnNmZXIgdGhlIGNvZGUgdG8gdGhlIGVkaXRvclxuZnVuY3Rpb24gdHJhbnNmZXJFeGFtcGxlQ29kZVRvRWRpdG9yKClcbntcbiAgICAvLyBTYXZlIGN1cnJlbnQgY29kZSFcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG5cbiAgICAvLyBIaWRlIHRoZSBleGFtcGxlIHpvbmVcbiAgICAkKFwiI2V4YW1wbGVfem9uZVwiKS5oaWRlKCAzMDAgKTtcblxuICAgIC8vIFRyYW5zZmVyIGluIGVkaXRvciBcbiAgICBjb2RlTWlycm9yRWRpdG9yLnNldFZhbHVlKCBFWEFNUExFX0NPREVTWyBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZCBdLnRvU3RyaW5nKCkgKTtcbn1cblxuXG5leHBvcnRzLmluaXRFeGFtcGxlc0J1dHRvbnMgPSBpbml0RXhhbXBsZXNCdXR0b25zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBHbG9iYWwgV2ViU29ja2V0IGZyb20gdGhlIGJyb3dzZXIgdG8gdGhlIFJQaSwgd2hpY2ggaGFuZGxlcyBiaS1kaXIgY29tbXVuaWNhdGlvbnMuIERlZmluZWQgaW4gdGhlIHdlYnBhZ2UuXG4vLyB2YXIgYnJvd3NlcldlYlNvY2tldCA9IG51bGw7XG5cbi8vID09PT09IE1vZHVsZXMgUmVxdWlyZWQgPT09PT1cbnZhciBpbml0QnJvd3NlclNvY2tldCAgID0gcmVxdWlyZSgnLi9zb2NrZXQnKS5pbml0QnJvd3NlclNvY2tldDtcbnZhciBpbml0RWRpdG9yQnV0dG9ucyAgID0gcmVxdWlyZSgnLi9qcy1lZGl0b3InKS5pbml0RWRpdG9yQnV0dG9ucztcbnZhciBpbml0RXhhbXBsZXNCdXR0b25zID0gcmVxdWlyZSgnLi9leGFtcGxlLWJ1dHRvbnMnKS5pbml0RXhhbXBsZXNCdXR0b25zO1xuXG4vLyA9PT09PSBTdGFydCBvZiB0aGUgbWFpbiBwYWdlID09PT09XG4kKGRvY3VtZW50KS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cbiAgICAvLyAtLS0gSW5pdGlhbGl6ZSBhbGwgdGhlIHZpZXdzXG4gICAgLy8gaW5pdFZpZXdzKCk7XG5cbiAgICAvLyAtLS0gU3RhcnQgdGhlIFdlYlNvY2tldCBiZXR3ZWVuIHRoZSBicm93c2VyIGFuZCB0aGUgUlBpXG4gICAgYnJvd3NlcldlYlNvY2tldCA9IGluaXRCcm93c2VyU29ja2V0KCk7XG5cbiAgICAvLyAtLS0gSW5pdCB0aGUgYmVoYXZpb3VyIG9mIGJ1dHRvbnMgZm9yIHRoZSBKUyBlZGl0b3JcbiAgICBpbml0RWRpdG9yQnV0dG9ucygpO1xuICAgIC8vXG4gICAgaW5pdEV4YW1wbGVzQnV0dG9ucygpO1xuXG59KTtcblxuXG4vLyBTYXZlIG1vZGVscyB0byBsb2NhbHN0b3JhZ2Vcbi8vIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd0b3RvJywgSlNPTi5zdHJpbmdpZnkoXCJ0b3RvXCIpKTtcblxuLy8kLnN1YnNjcmliZSgncmVzZXRzY3JlZW4nLCBmdW5jdGlvbigpIHtcbi8vICAkKCcjcmVzdWx0JykudGV4dCgnJyk7XG4vLyAgJCgnLmVycm9yLXJvdycpLmhpZGUoKTtcbi8vfSk7XG4iLCIvKipcbiAqICBNYW5hZ2VzIHRoZSBKUyBlZGl0b3IgKENvZGVNaXJyb3IgaW4gdGhpcyBwcm9qZWN0KVxuICovXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCk7XG5cbi8vIFRvIGF2b2lkIGRvdWJsZS1jbGlja3NcbnZhciBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyAgICAgPSBudWxsO1xudmFyIGxhc3RDbGlja09uU3RvcFNwaGVybyAgICAgICA9IG51bGw7XG4vLyBUbyBhdm9pZCBkdXBsaWNhdGUgc2F2ZXNcbnZhciBsYXN0Q29udGVudFNhdmVFZGl0b3JHZW5lcmF0aW9uID0gbnVsbDtcblxuXG5mdW5jdGlvbiBpbml0RWRpdG9yQnV0dG9ucygpXG57XG4gICAgLy8gTGlzdGVuZXJzXG4gICAgJChcIiNwdXNoX3RvX3NwaGVyb1wiKS5vbihcImNsaWNrXCIsIHB1c2hUb1NwaGVyb09uQ2xpY2sgKTsgICAgICAgICAgICAgICAgICAgICAgLy8gZnVuY3Rpb24oKSB7IHB1c2hUb1NwaGVyb09uQ2xpY2soIGJyb3dzZXJXZWJTb2NrZXQpOyB9KTtcbiAgICAkKFwiI3N0b3Bfc3BoZXJvXCIpLm9uKFwiY2xpY2tcIiwgICAgc3RvcFNwaGVyb09uQ2xpY2sgKTtcblxuICAgIC8vIEludGVydmFsIHRvIHJlY29yZCBjb2RlIGhpc3RvcnksIHdoZW4gdGhlcmUgYXJlIGNoYW5nZXMsIGluIGxvY2FsIHN0b3JhZ2UsXG4gICAgLy8gIGV2ZXJ5IG1pbnV0ZSBhdCBtb3N0LCBrZWVwIHRoZSBsYXN0IDUwIG1heCBvZiBjb2RlcyBwb3N0ZWQgKHRoZXkgc2hvdWxkIGJlIHN0b3JlZCBvbiBSUGkpXG4gICAgc2V0SW50ZXJ2YWwoIHNhdmVDb2RlRXZlcnlNaW51dGVUb0xvY2FsU3RvcmFnZSwgNjAwMDAgKTtcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBwdXNoVG9TcGhlcm9PbkNsaWNrKClcbntcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoIGxhc3RDbGlja09uUHVzaFRvU3BoZXJvICYmIChub3cgLSBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybykgPCA1MDAwICkge1xuICAgICAgICBjb25zb2xlLmxvZyggXCJwdXNoVG9TcGhlcm9PbkNsaWNrIGNsaWNrZWQgdHdpY2Ugd2l0aGluIDUgc2Vjb25kcy4gSWdub3JpbmchXCIgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyA9IG5vdztcblxuICAgIC8vIC0tLSBUcmFuc2ZlciB0aGUgQ09ERSB0byBSUGlcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIC8vXG4gICAgLy8gIEZJWE1FOiBzcGhlcm9JbmRleCAhISEhIEZJWE1FICEhISFcbiAgICB2YXIgbXlJbmRleCA9IDA7XG4gICAgLy9cbiAgICBicm93c2VyV2ViU29ja2V0LnNlbmQoIEpTT04uc3RyaW5naWZ5KCB7IFwiYWN0aW9uXCI6IFwicHVzaC1jb2RlXCIsIFwic3BoZXJvSW5kZXhcIjogbXlJbmRleCAsIFwidXNlckNvZGVcIjogdXNlckNvZGUgfSApKTsgIC8vIGJyb3dzZXJXZWJTb2NrZXQgZ2xvYmFsIHZhclxuXG4gICAgLy8gLS0tIFNhdmUgdXNlckNvZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZSggdXNlckNvZGUgKTtcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzdG9wU3BoZXJvT25DbGljaygpXG57XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgaWYgKCBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gJiYgKG5vdyAtIGxhc3RDbGlja09uU3RvcFNwaGVybykgPCA1MDAwICkge1xuICAgICAgICBjb25zb2xlLmxvZyggXCJwdXNoVG9TcGhlcm9PbkNsaWNrIGNsaWNrZWQgdHdpY2Ugd2l0aGluIDUgc2Vjb25kcy4gSWdub3JpbmchXCIgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gPSBub3c7XG5cbiAgICAvLyAgRklYTUU6IHNwaGVyb0luZGV4ICEhISEgRklYTUUgISEhIVxuICAgIHZhciBteUluZGV4ID0gMDtcbiAgICAvL1xuXG4gICAgLy8gLS0tIFRyYW5zZmVyIHRoZSBTVE9QIGNvbW1hbmQgdG8gUlBpXG4gICAgYnJvd3NlcldlYlNvY2tldC5zZW5kKCBKU09OLnN0cmluZ2lmeSggeyBcImFjdGlvblwiOlwic3RvcC1jb2RlXCIsIFwic3BoZXJvSW5kZXhcIjogbXlJbmRleCB9ICkpOyAgICAgICAgIC8vIGJyb3dzZXJXZWJTb2NrZXQgZ2xvYmFsIHZhclxuICAgIHJldHVybjtcbn1cblxuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIHNhdmVDb2RlRXZlcnlNaW51dGVUb0xvY2FsU3RvcmFnZSgpXG57XG4gICAgaWYgKCBsYXN0Q29udGVudFNhdmVFZGl0b3JHZW5lcmF0aW9uICYmIGNvZGVNaXJyb3JFZGl0b3IuaXNDbGVhbiggbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiApICkge1xuICAgICAgICAvLyBObyBuZWVkIHRvIHNhdmUsIG5vIGNoYW5nZXNcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBPdHcgc2F2ZSB0byBsb2NhbFN0b3JhZ2VcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlKCB1c2VyQ29kZSApXG57XG4gICAgdmFyIGl0ZW1OYW1lID0gXCJjb2RlLVwiICsgRGF0ZS5ub3coKTtcbiAgICAvLyAtLS0gU2F2ZSB1c2VyQ29kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggaXRlbU5hbWUsIEpTT04uc3RyaW5naWZ5KHVzZXJDb2RlKSApO1xuICAgIHZhciBjb2RlTGlzdCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29kZUxpc3RcIik7XG4gICAgY29kZUxpc3QgPSAoIGNvZGVMaXN0ICkgPyBKU09OLnBhcnNlKCBjb2RlTGlzdCApIDogW107XG4gICAgY29kZUxpc3QucHVzaCggaXRlbU5hbWUgKTtcbiAgICBpZiAoY29kZUxpc3QubGVuZ3RoID4gNTApIHsgICAgICAgICAgICAgLy8gUHJldmVudCBpdCBmcm9tIGdldHRpbmcgdG9vIGJpZyFcbiAgICAgICAgdmFyIGZpcnN0SXRlbU5hbWUgPSBjb2RlTGlzdC5zaGlmdCgpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSggZmlyc3RJdGVtTmFtZSApO1xuICAgIH1cbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggXCJjb2RlTGlzdFwiLCBKU09OLnN0cmluZ2lmeShjb2RlTGlzdCkgKTtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBzYXZlXG4gICAgbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiA9IGNvZGVNaXJyb3JFZGl0b3IuY2hhbmdlR2VuZXJhdGlvbigpO1xuICAgIHJldHVybjtcbn1cblxuXG5leHBvcnRzLmluaXRFZGl0b3JCdXR0b25zID0gaW5pdEVkaXRvckJ1dHRvbnM7XG5leHBvcnRzLnNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UgPSBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlO1xuIiwiLyoqXG4gKiAgSGFuZGxlIFdlYlNvY2tldCBjb25uZWN0aW9uIGZyb20gYnJvd3NlciB0byBSYXNwYmVycnkgUGlcbiAqL1xuLy92YXIgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5mdW5jdGlvbiBpbml0QnJvd3NlclNvY2tldCgpXG57XG4gICB2YXIgc29ja2V0O1xuICAgdmFyIGxvYyA9IHdpbmRvdy5sb2NhdGlvbjtcbiAgIHZhciB1cmwgPSAnd3M6Ly8nKyBsb2MuaG9zdG5hbWUrKGxvYy5wb3J0ID8gJzonK2xvYy5wb3J0OiAnJykgKycvd3MvdXNlcmNvZGluZy8nKyAobG9jLnNlYXJjaCA/IGxvYy5zZWFyY2ggOiAnJyk7IC8vIEZvcndhcmQgdXJsIHBhcmFtZXRlcnNcbiAgIGNvbnNvbGUubG9nKCdTb2NrZXQgVVJMID0gJywgdXJsKTtcblxuICAgLy8gLS0tIHV0aWxzXG4gICB2YXIgbyAgICAgICAgID0gJCh7fSk7XG4gICAkLnN1YnNjcmliZSAgID0gby5vbi5iaW5kKG8pO1xuICAgJC51bnN1YnNjcmliZSA9IG8ub2ZmLmJpbmQobyk7XG4gICAkLnB1Ymxpc2ggICAgID0gby50cmlnZ2VyLmJpbmQobyk7XG5cblxuICAgLy8gLS0tIE9wZW4gc29ja2V0XG4gICB0cnkge1xuICAgICAgIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcbiAgIH0gY2F0Y2goZXhjKSB7XG4gICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBXUyBjb25uZWN0aW9uIGVycm9yOiAnLCBleGMpO1xuICAgfVxuXG4gICBzb2NrZXQub25vcGVuID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgJC5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgIH0pO1xuICAgICAgIC8vLyBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XG4gICB9O1xuXG5cbiAgICAgLy8gLS0tLS0tLSBIZXJlIHdlIGdldCB0aGUgaW5mbyFcbiAgICAgc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgdmFyIGRhdGFPYmogPSBKU09OLnBhcnNlKCBldnQuZGF0YSApO1xuICAgICAgICAgaWYgKGRhdGFPYmouZXJyb3IpIHtcbiAgICAgICAgICAgICAvLy8gc2hvd0Vycm9yKG1zZy5lcnJvcik7XG4gICAgICAgICAgICAgJC5wdWJsaXNoKCdzb2NrZXRzdG9wJyk7XG4gICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgfVxuICAgICAgICAgLy8gLS0tIFRoaXMgaXMgdGhlIG5ldyBiZXN0IHdvcmRzIGFycmF5XG4gICAgICAgICAvLyBGSVhNRVxuICAgICAgICAgdmFyIGpzb25Ccm93c2VyID0gZGF0YU9iajtcbiAgICAgICAgIGlmIChqc29uQnJvd3Nlcikge1xuICAgICAgICAgICAgIGlmIChqc29uQnJvd3Nlci5yZXN1bHRzWzBdLmZpbmFsKSB7XG4gICAgICAgICAgICAgICAgIC8vIGdsb2JhbCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICB1cGRhdGVGaW5hbEJyb3dzZXIoIGpzb25Ccm93c2VyICk7XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgLy8gZ2xvYmFsIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgIHVwZGF0ZUludGVyaW1Ccm93c2VyKCBqc29uQnJvd3NlciApO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgb25tZXNzYWdlIGpzb25Ccm93c2VyIEVNUFRZICcsIGV2dCk7XG4gICAgICAgICB9XG4gICAgICAgICByZXR1cm47XG4gICAgIH07XG5cblxuICAgICAvLyAtLS0gRXJyb3IgJiBDbG9zaW5nXG4gICAgIHNvY2tldC5vbmVycm9yID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9uZXJyb3IgU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAvLy8gc2hvd0Vycm9yKCdBcHBsaWNhdGlvbiBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgLy8gVE9ETyA/PyBDbG9zZSA/PyAvLyAkLnB1Ymxpc2goJ3NvY2tldHN0b3AnKTtcbiAgICAgfTtcblxuICAgICBzb2NrZXQub25jbG9zZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgY29uc29sZS5sb2coJ0Jyb3dzZXIgV1Mgb25jbG9zZTogJywgZXZ0KTtcbiAgICAgICAgIGlmIChldnQuY29kZSA+IDEwMDApIHtcbiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9uY2xvc2UgU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAgICAgLy8gc2hvd0Vycm9yKCdTZXJ2ZXIgZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgICAgICAvLyByZXR1cm4gZmFsc2U7XG4gICAgICAgICB9XG4gICAgICAgICAvLyBNYWRlIGl0IHRocm91Z2gsIG5vcm1hbCBjbG9zZVxuICAgICAgICAgJC51bnN1YnNjcmliZSgnc29ja2V0c3RvcCcpO1xuICAgICB9O1xuXG4gICAgIHJldHVybiBzb2NrZXQ7XG59XG5cbmV4cG9ydHMuaW5pdEJyb3dzZXJTb2NrZXQgPSBpbml0QnJvd3NlclNvY2tldDtcbiJdfQ==
