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
        $("#"+exampleId).on("click", function() { showExampleArea(exampleId); });
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
    $.get('/js/code-examples/'+ exampleId, function( data ) {
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
function transferExampleCodeToEditor( exampleId )
{
    currentExampleCodeIdDisplayed = exampleId;

    // Save current code!
    var userCode = codeMirrorEditor.getValue();                                     // codeMirrorEditor global var
    saveCodeToLocalStorage( userCode );

    codeMirrorEditor.setValue( EXAMPLE_CODES[ currentExampleCodeIdDisplayed ] );
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvZXhhbXBsZS1idXR0b25zLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9qcy1lZGl0b3IuanMiLCJzcmMvYnJvd3Nlci9zb2NrZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiAgSGFuZGxlIHRoZSBjbGlja3Mgb24gdGhlIGV4YW1wbGUgYnV0dG9ucyBhbmQgdGhlIGxvYWRpbmcgb2YgdGhlIGNvZGUgaW4gdGhlIEpTIGVkaXRvclxuICovXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCk7XG5cbnZhciBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlID0gcmVxdWlyZShcIi4vanMtZWRpdG9yXCIpLnNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2U7XG5cbi8vIEFycmF5IG9mIGlkc1xudmFyIEVYQU1QTEVfQ09ERV9JRFMgPSBbXG4gICAgXCJiZWdpbm5lcjFcIiwgXCJiZWdpbm5lcjJcIiwgXCJiZWdpbm5lcjNcIiwgXCJiZWdpbm5lcjRcIiwgXCJiZWdpbm5lcjVcIixcbiAgICBcImFkdmFuY2VkMVwiLCBcImFkdmFuY2VkMlwiLCBcImFkdmFuY2VkM1wiXG5dO1xuXG4vLyBLZXkgPSBodG1sIGlkLCBWYWx1ZSA9IHRleHQgb2YgdGhlIGNvZGVcbnZhciBFWEFNUExFX0NPREVTID0gW107XG5cbi8vIFRoZSBvbmUgY3VycmVudGx5IGRpc3BsYXllZCBpbiB0aGUgZXhhbXBsZSB6b25lIChtYXkgYmUgbnVsbClcbnZhciBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZDtcblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBpbml0RXhhbXBsZXNCdXR0b25zKClcbntcbiAgICBkb3dubG9hZEV4YW1wbGVDb2RlKCBcImRlZmF1bHRcIiApO1xuXG4gICAgLy8gRm9yIGFsbCBleGFtcGxlc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgRVhBTVBMRV9DT0RFX0lEUy5sZW5ndGg7IGkrKyApIHtcbiAgICAgICAgdmFyIGV4YW1wbGVJZCA9IEVYQU1QTEVfQ09ERV9JRFNbaV07XG5cbiAgICAgICAgLy8gLS0tIERvd25sb2FkIHRoZSBleGFtcGxlIGFzIGFqYXggYW5kIHN0b3JlIGl0IGFzIGFzc29jaWF0aXZlIGFycmF5XG4gICAgICAgIGRvd25sb2FkRXhhbXBsZUNvZGUoIGV4YW1wbGVJZCApO1xuXG4gICAgICAgIC8vIC0tLSBBZGQgbGlzdGVuZXJzXG4gICAgICAgICQoXCIjXCIrZXhhbXBsZUlkKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBzaG93RXhhbXBsZUFyZWEoZXhhbXBsZUlkKTsgfSk7XG4gICAgfVxuXG4gICAgLy8gLS0tIEJpbmQgdGhlIGhpZGUgLyBlZGl0IGNvZGUgYnV0dG9uc1xuICAgICQoXCIjaGlkZV9leGFtcGxlX3pvbmVcIikub24oXCJjbGlja1wiLCBmdW5jdGlvbigpIHsgJChcIiNleGFtcGxlX3pvbmVcIikuaGlkZSggMzAwICk7IH0pOyAgIC8vIG1zXG5cbiAgICAkKFwiI3B1dF9leGFtcGxlX2luX2VkaXRvclwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyB0cmFuc2ZlckV4YW1wbGVDb2RlVG9FZGl0b3IoKTsgfSk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8vIC0tLSBEb3dubG9hZCBhbGwgZXhhbXBsZXMgbG9jYWxseSB0aHJvdWdoIGFqYXhcbmZ1bmN0aW9uIGRvd25sb2FkRXhhbXBsZUNvZGUoIGV4YW1wbGVJZCApXG57XG4gICAgLy8gRG93bmxvYWQgYW5kIFNhdmUgaXRcbiAgICAkLmdldCgnL2pzL2NvZGUtZXhhbXBsZXMvJysgZXhhbXBsZUlkLCBmdW5jdGlvbiggZGF0YSApIHtcbiAgICAgICAgRVhBTVBMRV9DT0RFU1sgZXhhbXBsZUlkIF0gPSBkYXRhO1xuICAgIH0pO1xufVxuXG5cbi8vIC0tLSBTaG93IHRoZSBjb2RlIGluIHRoZSBleGFtcGxlIGFyZWFcbmZ1bmN0aW9uIHNob3dFeGFtcGxlQXJlYSggZXhhbXBsZUlkIClcbntcbiAgICBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZCA9IGV4YW1wbGVJZDtcbiAgICAvLyBTZXQgZGl2IGNvbnRlbnQgKyBzaG93IGRpdlxuICAgICQoXCIjZXhhbXBsZV9jb2RlXCIpLmh0bWwoIEVYQU1QTEVfQ09ERVNbIGV4YW1wbGVJZCBdICk7XG4gICAgJChcIiNleGFtcGxlX3pvbmVcIikuc2hvdyggNDAwICk7ICAvLyBtc1xufVxuXG5cbi8vIC0tLSBUcmFuc2ZlciB0aGUgY29kZSB0byB0aGUgZWRpdG9yXG5mdW5jdGlvbiB0cmFuc2ZlckV4YW1wbGVDb2RlVG9FZGl0b3IoIGV4YW1wbGVJZCApXG57XG4gICAgY3VycmVudEV4YW1wbGVDb2RlSWREaXNwbGF5ZWQgPSBleGFtcGxlSWQ7XG5cbiAgICAvLyBTYXZlIGN1cnJlbnQgY29kZSFcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG5cbiAgICBjb2RlTWlycm9yRWRpdG9yLnNldFZhbHVlKCBFWEFNUExFX0NPREVTWyBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZCBdICk7XG59XG5cblxuZXhwb3J0cy5pbml0RXhhbXBsZXNCdXR0b25zID0gaW5pdEV4YW1wbGVzQnV0dG9ucztcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gR2xvYmFsIFdlYlNvY2tldCBmcm9tIHRoZSBicm93c2VyIHRvIHRoZSBSUGksIHdoaWNoIGhhbmRsZXMgYmktZGlyIGNvbW11bmljYXRpb25zLiBEZWZpbmVkIGluIHRoZSB3ZWJwYWdlLlxuLy8gdmFyIGJyb3dzZXJXZWJTb2NrZXQgPSBudWxsO1xuXG4vLyA9PT09PSBNb2R1bGVzIFJlcXVpcmVkID09PT09XG52YXIgaW5pdEJyb3dzZXJTb2NrZXQgICA9IHJlcXVpcmUoJy4vc29ja2V0JykuaW5pdEJyb3dzZXJTb2NrZXQ7XG52YXIgaW5pdEVkaXRvckJ1dHRvbnMgICA9IHJlcXVpcmUoJy4vanMtZWRpdG9yJykuaW5pdEVkaXRvckJ1dHRvbnM7XG52YXIgaW5pdEV4YW1wbGVzQnV0dG9ucyA9IHJlcXVpcmUoJy4vZXhhbXBsZS1idXR0b25zJykuaW5pdEV4YW1wbGVzQnV0dG9ucztcblxuLy8gPT09PT0gU3RhcnQgb2YgdGhlIG1haW4gcGFnZSA9PT09PVxuJChkb2N1bWVudCkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gLS0tIEluaXRpYWxpemUgYWxsIHRoZSB2aWV3c1xuICAgIC8vIGluaXRWaWV3cygpO1xuXG4gICAgLy8gLS0tIFN0YXJ0IHRoZSBXZWJTb2NrZXQgYmV0d2VlbiB0aGUgYnJvd3NlciBhbmQgdGhlIFJQaVxuICAgIGJyb3dzZXJXZWJTb2NrZXQgPSBpbml0QnJvd3NlclNvY2tldCgpO1xuXG4gICAgLy8gLS0tIEluaXQgdGhlIGJlaGF2aW91ciBvZiBidXR0b25zIGZvciB0aGUgSlMgZWRpdG9yXG4gICAgaW5pdEVkaXRvckJ1dHRvbnMoKTtcbiAgICAvL1xuICAgIGluaXRFeGFtcGxlc0J1dHRvbnMoKTtcblxufSk7XG5cblxuLy8gU2F2ZSBtb2RlbHMgdG8gbG9jYWxzdG9yYWdlXG4vLyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndG90bycsIEpTT04uc3RyaW5naWZ5KFwidG90b1wiKSk7XG5cbi8vJC5zdWJzY3JpYmUoJ3Jlc2V0c2NyZWVuJywgZnVuY3Rpb24oKSB7XG4vLyAgJCgnI3Jlc3VsdCcpLnRleHQoJycpO1xuLy8gICQoJy5lcnJvci1yb3cnKS5oaWRlKCk7XG4vL30pO1xuIiwiLyoqXG4gKiAgTWFuYWdlcyB0aGUgSlMgZWRpdG9yIChDb2RlTWlycm9yIGluIHRoaXMgcHJvamVjdClcbiAqL1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpO1xuXG4vLyBUbyBhdm9pZCBkb3VibGUtY2xpY2tzXG52YXIgbGFzdENsaWNrT25QdXNoVG9TcGhlcm8gICAgID0gbnVsbDtcbnZhciBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gICAgICAgPSBudWxsO1xuLy8gVG8gYXZvaWQgZHVwbGljYXRlIHNhdmVzXG52YXIgbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiA9IG51bGw7XG5cblxuZnVuY3Rpb24gaW5pdEVkaXRvckJ1dHRvbnMoKVxue1xuICAgIC8vIExpc3RlbmVyc1xuICAgICQoXCIjcHVzaF90b19zcGhlcm9cIikub24oXCJjbGlja1wiLCBwdXNoVG9TcGhlcm9PbkNsaWNrICk7ICAgICAgICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uKCkgeyBwdXNoVG9TcGhlcm9PbkNsaWNrKCBicm93c2VyV2ViU29ja2V0KTsgfSk7XG4gICAgJChcIiNzdG9wX3NwaGVyb1wiKS5vbihcImNsaWNrXCIsICAgIHN0b3BTcGhlcm9PbkNsaWNrICk7XG5cbiAgICAvLyBJbnRlcnZhbCB0byByZWNvcmQgY29kZSBoaXN0b3J5LCB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzLCBpbiBsb2NhbCBzdG9yYWdlLFxuICAgIC8vICBldmVyeSBtaW51dGUgYXQgbW9zdCwga2VlcCB0aGUgbGFzdCA1MCBtYXggb2YgY29kZXMgcG9zdGVkICh0aGV5IHNob3VsZCBiZSBzdG9yZWQgb24gUlBpKVxuICAgIHNldEludGVydmFsKCBzYXZlQ29kZUV2ZXJ5TWludXRlVG9Mb2NhbFN0b3JhZ2UsIDYwMDAwICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gcHVzaFRvU3BoZXJvT25DbGljaygpXG57XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgaWYgKCBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyAmJiAobm93IC0gbGFzdENsaWNrT25QdXNoVG9TcGhlcm8pIDwgNTAwMCApIHtcbiAgICAgICAgY29uc29sZS5sb2coIFwicHVzaFRvU3BoZXJvT25DbGljayBjbGlja2VkIHR3aWNlIHdpdGhpbiA1IHNlY29uZHMuIElnbm9yaW5nIVwiICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdENsaWNrT25QdXNoVG9TcGhlcm8gPSBub3c7XG5cbiAgICAvLyAtLS0gVHJhbnNmZXIgdGhlIENPREUgdG8gUlBpXG4gICAgdmFyIHVzZXJDb2RlID0gY29kZU1pcnJvckVkaXRvci5nZXRWYWx1ZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb2RlTWlycm9yRWRpdG9yIGdsb2JhbCB2YXJcbiAgICAvL1xuICAgIC8vICBGSVhNRTogc3BoZXJvSW5kZXggISEhISBGSVhNRSAhISEhXG4gICAgdmFyIG15SW5kZXggPSAwO1xuICAgIC8vXG4gICAgYnJvd3NlcldlYlNvY2tldC5zZW5kKCBKU09OLnN0cmluZ2lmeSggeyBcImFjdGlvblwiOiBcInB1c2gtY29kZVwiLCBcInNwaGVyb0luZGV4XCI6IG15SW5kZXggLCBcInVzZXJDb2RlXCI6IHVzZXJDb2RlIH0gKSk7ICAvLyBicm93c2VyV2ViU29ja2V0IGdsb2JhbCB2YXJcblxuICAgIC8vIC0tLSBTYXZlIHVzZXJDb2RlIHRvIGxvY2FsU3RvcmFnZVxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gc3RvcFNwaGVyb09uQ2xpY2soKVxue1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIGlmICggbGFzdENsaWNrT25TdG9wU3BoZXJvICYmIChub3cgLSBsYXN0Q2xpY2tPblN0b3BTcGhlcm8pIDwgNTAwMCApIHtcbiAgICAgICAgY29uc29sZS5sb2coIFwicHVzaFRvU3BoZXJvT25DbGljayBjbGlja2VkIHR3aWNlIHdpdGhpbiA1IHNlY29uZHMuIElnbm9yaW5nIVwiICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdENsaWNrT25TdG9wU3BoZXJvID0gbm93O1xuXG4gICAgLy8gIEZJWE1FOiBzcGhlcm9JbmRleCAhISEhIEZJWE1FICEhISFcbiAgICB2YXIgbXlJbmRleCA9IDA7XG4gICAgLy9cblxuICAgIC8vIC0tLSBUcmFuc2ZlciB0aGUgU1RPUCBjb21tYW5kIHRvIFJQaVxuICAgIGJyb3dzZXJXZWJTb2NrZXQuc2VuZCggSlNPTi5zdHJpbmdpZnkoIHsgXCJhY3Rpb25cIjpcInN0b3AtY29kZVwiLCBcInNwaGVyb0luZGV4XCI6IG15SW5kZXggfSApKTsgICAgICAgICAvLyBicm93c2VyV2ViU29ja2V0IGdsb2JhbCB2YXJcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzYXZlQ29kZUV2ZXJ5TWludXRlVG9Mb2NhbFN0b3JhZ2UoKVxue1xuICAgIGlmICggbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiAmJiBjb2RlTWlycm9yRWRpdG9yLmlzQ2xlYW4oIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gKSApIHtcbiAgICAgICAgLy8gTm8gbmVlZCB0byBzYXZlLCBubyBjaGFuZ2VzXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gT3R3IHNhdmUgdG8gbG9jYWxTdG9yYWdlXG4gICAgdmFyIHVzZXJDb2RlID0gY29kZU1pcnJvckVkaXRvci5nZXRWYWx1ZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb2RlTWlycm9yRWRpdG9yIGdsb2JhbCB2YXJcbiAgICBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlKCB1c2VyQ29kZSApO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZSggdXNlckNvZGUgKVxue1xuICAgIHZhciBpdGVtTmFtZSA9IFwiY29kZS1cIiArIERhdGUubm93KCk7XG4gICAgLy8gLS0tIFNhdmUgdXNlckNvZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oIGl0ZW1OYW1lLCBKU09OLnN0cmluZ2lmeSh1c2VyQ29kZSkgKTtcbiAgICB2YXIgY29kZUxpc3QgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvZGVMaXN0XCIpO1xuICAgIGNvZGVMaXN0ID0gKCBjb2RlTGlzdCApID8gSlNPTi5wYXJzZSggY29kZUxpc3QgKSA6IFtdO1xuICAgIGNvZGVMaXN0LnB1c2goIGl0ZW1OYW1lICk7XG4gICAgaWYgKGNvZGVMaXN0Lmxlbmd0aCA+IDUwKSB7ICAgICAgICAgICAgIC8vIFByZXZlbnQgaXQgZnJvbSBnZXR0aW5nIHRvbyBiaWchXG4gICAgICAgIHZhciBmaXJzdEl0ZW1OYW1lID0gY29kZUxpc3Quc2hpZnQoKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oIGZpcnN0SXRlbU5hbWUgKTtcbiAgICB9XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oIFwiY29kZUxpc3RcIiwgSlNPTi5zdHJpbmdpZnkoY29kZUxpc3QpICk7XG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgc2F2ZVxuICAgIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gPSBjb2RlTWlycm9yRWRpdG9yLmNoYW5nZUdlbmVyYXRpb24oKTtcbiAgICByZXR1cm47XG59XG5cblxuZXhwb3J0cy5pbml0RWRpdG9yQnV0dG9ucyA9IGluaXRFZGl0b3JCdXR0b25zO1xuZXhwb3J0cy5zYXZlQ29kZVRvTG9jYWxTdG9yYWdlID0gc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZTtcbiIsIi8qKlxuICogIEhhbmRsZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBmcm9tIGJyb3dzZXIgdG8gUmFzcGJlcnJ5IFBpXG4gKi9cbi8vdmFyICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuZnVuY3Rpb24gaW5pdEJyb3dzZXJTb2NrZXQoKVxue1xuICAgdmFyIHNvY2tldDtcbiAgIHZhciBsb2MgPSB3aW5kb3cubG9jYXRpb247XG4gICB2YXIgdXJsID0gJ3dzOi8vJysgbG9jLmhvc3RuYW1lKyhsb2MucG9ydCA/ICc6Jytsb2MucG9ydDogJycpICsnL3dzL3VzZXJjb2RpbmcvJysgKGxvYy5zZWFyY2ggPyBsb2Muc2VhcmNoIDogJycpOyAvLyBGb3J3YXJkIHVybCBwYXJhbWV0ZXJzXG4gICBjb25zb2xlLmxvZygnU29ja2V0IFVSTCA9ICcsIHVybCk7XG5cbiAgIC8vIC0tLSB1dGlsc1xuICAgdmFyIG8gICAgICAgICA9ICQoe30pO1xuICAgJC5zdWJzY3JpYmUgICA9IG8ub24uYmluZChvKTtcbiAgICQudW5zdWJzY3JpYmUgPSBvLm9mZi5iaW5kKG8pO1xuICAgJC5wdWJsaXNoICAgICA9IG8udHJpZ2dlci5iaW5kKG8pO1xuXG5cbiAgIC8vIC0tLSBPcGVuIHNvY2tldFxuICAgdHJ5IHtcbiAgICAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG4gICB9IGNhdGNoKGV4Yykge1xuICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgV1MgY29ubmVjdGlvbiBlcnJvcjogJywgZXhjKTtcbiAgIH1cblxuICAgc29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICQuc3Vic2NyaWJlKCdzb2NrZXRzdG9wJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICB9KTtcbiAgICAgICAvLy8gc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICAgfTtcblxuXG4gICAgIC8vIC0tLS0tLS0gSGVyZSB3ZSBnZXQgdGhlIGluZm8hXG4gICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIHZhciBkYXRhT2JqID0gSlNPTi5wYXJzZSggZXZ0LmRhdGEgKTtcbiAgICAgICAgIGlmIChkYXRhT2JqLmVycm9yKSB7XG4gICAgICAgICAgICAgLy8vIHNob3dFcnJvcihtc2cuZXJyb3IpO1xuICAgICAgICAgICAgICQucHVibGlzaCgnc29ja2V0c3RvcCcpO1xuICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgIH1cbiAgICAgICAgIC8vIC0tLSBUaGlzIGlzIHRoZSBuZXcgYmVzdCB3b3JkcyBhcnJheVxuICAgICAgICAgLy8gRklYTUVcbiAgICAgICAgIHZhciBqc29uQnJvd3NlciA9IGRhdGFPYmo7XG4gICAgICAgICBpZiAoanNvbkJyb3dzZXIpIHtcbiAgICAgICAgICAgICBpZiAoanNvbkJyb3dzZXIucmVzdWx0c1swXS5maW5hbCkge1xuICAgICAgICAgICAgICAgICAvLyBnbG9iYWwgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgdXBkYXRlRmluYWxCcm93c2VyKCBqc29uQnJvd3NlciApO1xuICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIC8vIGdsb2JhbCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICB1cGRhdGVJbnRlcmltQnJvd3NlcigganNvbkJyb3dzZXIgKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9ubWVzc2FnZSBqc29uQnJvd3NlciBFTVBUWSAnLCBldnQpO1xuICAgICAgICAgfVxuICAgICAgICAgcmV0dXJuO1xuICAgICB9O1xuXG5cbiAgICAgLy8gLS0tIEVycm9yICYgQ2xvc2luZ1xuICAgICBzb2NrZXQub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmVycm9yIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgLy8vIHNob3dFcnJvcignQXBwbGljYXRpb24gZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgIC8vIFRPRE8gPz8gQ2xvc2UgPz8gLy8gJC5wdWJsaXNoKCdzb2NrZXRzdG9wJyk7XG4gICAgIH07XG5cbiAgICAgc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIFdTIG9uY2xvc2U6ICcsIGV2dCk7XG4gICAgICAgICBpZiAoZXZ0LmNvZGUgPiAxMDAwKSB7XG4gICAgICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmNsb3NlIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgICAgIC8vIHNob3dFcnJvcignU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAgICAgLy8gcmV0dXJuIGZhbHNlO1xuICAgICAgICAgfVxuICAgICAgICAgLy8gTWFkZSBpdCB0aHJvdWdoLCBub3JtYWwgY2xvc2VcbiAgICAgICAgICQudW5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnKTtcbiAgICAgfTtcblxuICAgICByZXR1cm4gc29ja2V0O1xufVxuXG5leHBvcnRzLmluaXRCcm93c2VyU29ja2V0ID0gaW5pdEJyb3dzZXJTb2NrZXQ7XG4iXX0=
