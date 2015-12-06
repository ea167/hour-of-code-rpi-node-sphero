(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/**
 *  Handle the clicks on the example buttons and the loading of the code in the JS editor
 */
var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

var saveCurrentEditorCodeToLocalStorage = require("./js-editor").saveCurrentEditorCodeToLocalStorage;

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
    saveCurrentEditorCodeToLocalStorage();

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
var initUserName        = require('./user-name').initUserName;

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
    //
    initUserName();
});


// Save models to localstorage
// localStorage.setItem('toto', JSON.stringify("toto"));

//$.subscribe('resetscreen', function() {
//  $('#result').text('');
//  $('.error-row').hide();
//});

},{"./example-buttons":1,"./js-editor":3,"./socket":4,"./user-name":5}],3:[function(require,module,exports){
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

    // Save on unload
    $(window).on("unload", saveCurrentEditorCodeToLocalStorage );

    // Onload, charge the previous code, or default.js
    loadEditorFirstCode();

    // Interval to record code history, when there are changes, in local storage,
    //  every minute at most, keep the last 50 max of codes posted (they should be stored on RPi)
    setInterval( saveCodeEveryMinuteToLocalStorage, 60000 );
    return;
}


/**
 *
 */
function loadEditorFirstCode()
{
    // Is there one in localStorage?
    var codeList = localStorage.getItem("codeList");
    codeList = ( codeList ) ? JSON.parse( codeList ) : null;

    if ( codeList && codeList.length >= 1) {
        var storedCode = localStorage.getItem( codeList[codeList.length - 1] );
        storedCode = ( storedCode ) ? JSON.parse( storedCode ) : null;
        if ( storedCode ) {
            codeMirrorEditor.setValue( storedCode );
            return;
        }
    }

    // Otherwise load default.js
    $.get('/js/code-examples/default.js', function( data ) {
        codeMirrorEditor.setValue( data.toString() );
    });
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
    saveCurrentEditorCodeToLocalStorage();
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

// Shortcut
function saveCurrentEditorCodeToLocalStorage()
{
    var userCode = codeMirrorEditor.getValue();                                     // codeMirrorEditor global var
    saveCodeToLocalStorage( userCode );
}



exports.initEditorButtons = initEditorButtons;
exports.saveCurrentEditorCodeToLocalStorage = saveCurrentEditorCodeToLocalStorage;

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

},{}],5:[function(require,module,exports){
(function (global){
/**
 *  UI on User Name + its repercussions
 */

var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

// Array of ids
var STUDENT_FANCY_NAMES = [
    "Mama Bear", "Papa Bear", "Iron Pacman", "Phineas Berf", "Stuart Minion",
    "Flash Cordon", "Chef Sayram", "Marcus Lemon", "Lion Messy", "Elsa Frozin",
    "Clown Bozo", "Rabbi Jacob"
];

/**
 *
 */
function initUserName()
{
    loadStudentName();

    // Listeners
    $("#student_name").on("change", saveStudentName );                      // function() { pushToSpheroOnClick( browserWebSocket); });

    return;
}


function loadStudentName()
{
    var nam = localStorage.getItem("studentName");
    if (!nam) {
        nam = STUDENT_FANCY_NAMES[ Math.floor( Math.random() * STUDENT_FANCY_NAMES.length ) ];
    }
    $("#student_name").val( nam );
}

function saveStudentName()
{
    var nam = $("#student_name").val();
    if (nam) {
        localStorage.setItem( "studentName", nam );
    } else {
        localStorage.removeItem( "studentName" );
    }
}



exports.initUserName = initUserName;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvZXhhbXBsZS1idXR0b25zLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9qcy1lZGl0b3IuanMiLCJzcmMvYnJvd3Nlci9zb2NrZXQuanMiLCJzcmMvYnJvd3Nlci91c2VyLW5hbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiAgSGFuZGxlIHRoZSBjbGlja3Mgb24gdGhlIGV4YW1wbGUgYnV0dG9ucyBhbmQgdGhlIGxvYWRpbmcgb2YgdGhlIGNvZGUgaW4gdGhlIEpTIGVkaXRvclxuICovXG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCk7XG5cbnZhciBzYXZlQ3VycmVudEVkaXRvckNvZGVUb0xvY2FsU3RvcmFnZSA9IHJlcXVpcmUoXCIuL2pzLWVkaXRvclwiKS5zYXZlQ3VycmVudEVkaXRvckNvZGVUb0xvY2FsU3RvcmFnZTtcblxuLy8gQXJyYXkgb2YgaWRzXG52YXIgRVhBTVBMRV9DT0RFX0lEUyA9IFtcbiAgICBcImJlZ2lubmVyMVwiLCBcImJlZ2lubmVyMlwiLCBcImJlZ2lubmVyM1wiLCBcImJlZ2lubmVyNFwiLCBcImJlZ2lubmVyNVwiLFxuICAgIFwiYWR2YW5jZWQxXCIsIFwiYWR2YW5jZWQyXCIsIFwiYWR2YW5jZWQzXCJcbl07XG5cbi8vIEtleSA9IGh0bWwgaWQsIFZhbHVlID0gdGV4dCBvZiB0aGUgY29kZVxudmFyIEVYQU1QTEVfQ09ERVMgPSBbXTtcblxuLy8gVGhlIG9uZSBjdXJyZW50bHkgZGlzcGxheWVkIGluIHRoZSBleGFtcGxlIHpvbmUgKG1heSBiZSBudWxsKVxudmFyIGN1cnJlbnRFeGFtcGxlQ29kZUlkRGlzcGxheWVkO1xuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gaW5pdEV4YW1wbGVzQnV0dG9ucygpXG57XG4gICAgLy8gRm9yIGFsbCBleGFtcGxlc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgRVhBTVBMRV9DT0RFX0lEUy5sZW5ndGg7IGkrKyApIHtcbiAgICAgICAgdmFyIGV4YW1wbGVJZCA9IEVYQU1QTEVfQ09ERV9JRFNbaV07XG5cbiAgICAgICAgLy8gLS0tIERvd25sb2FkIHRoZSBleGFtcGxlIGFzIGFqYXggYW5kIHN0b3JlIGl0IGFzIGFzc29jaWF0aXZlIGFycmF5XG4gICAgICAgIGRvd25sb2FkRXhhbXBsZUNvZGUoIGV4YW1wbGVJZCApO1xuXG4gICAgICAgIC8vIC0tLSBBZGQgbGlzdGVuZXJzXG4gICAgICAgICQoXCIjXCIrZXhhbXBsZUlkKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGV4SWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHsgc2hvd0V4YW1wbGVBcmVhKGV4SWQpOyB9XG4gICAgICAgIH0oZXhhbXBsZUlkKSApOyAgICAgICAgICAgICAgIC8vIE90dyBrZWVwcyB0aGUgbGF0ZXN0IHZhbHVlIG9mIGV4YW1wbGVJZFxuICAgIH1cblxuICAgIC8vIC0tLSBCaW5kIHRoZSBoaWRlIC8gZWRpdCBjb2RlIGJ1dHRvbnNcbiAgICAkKFwiI2hpZGVfZXhhbXBsZV96b25lXCIpLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7ICQoXCIjZXhhbXBsZV96b25lXCIpLmhpZGUoIDMwMCApOyB9KTsgICAvLyBtc1xuXG4gICAgJChcIiNwdXRfZXhhbXBsZV9pbl9lZGl0b3JcIikub24oXCJjbGlja1wiLCBmdW5jdGlvbigpIHsgdHJhbnNmZXJFeGFtcGxlQ29kZVRvRWRpdG9yKCk7IH0pO1xuICAgIHJldHVybjtcbn1cblxuXG4vLyAtLS0gRG93bmxvYWQgYWxsIGV4YW1wbGVzIGxvY2FsbHkgdGhyb3VnaCBhamF4XG5mdW5jdGlvbiBkb3dubG9hZEV4YW1wbGVDb2RlKCBleGFtcGxlSWQgKVxue1xuICAgIC8vIERvd25sb2FkIGFuZCBTYXZlIGl0XG4gICAgJC5nZXQoJy9qcy9jb2RlLWV4YW1wbGVzLycrIGV4YW1wbGVJZCArJy5qcycsIGZ1bmN0aW9uKCBkYXRhICkge1xuICAgICAgICBFWEFNUExFX0NPREVTWyBleGFtcGxlSWQgXSA9IGRhdGE7XG4gICAgfSk7XG59XG5cblxuLy8gLS0tIFNob3cgdGhlIGNvZGUgaW4gdGhlIGV4YW1wbGUgYXJlYVxuZnVuY3Rpb24gc2hvd0V4YW1wbGVBcmVhKCBleGFtcGxlSWQgKVxue1xuICAgIGN1cnJlbnRFeGFtcGxlQ29kZUlkRGlzcGxheWVkID0gZXhhbXBsZUlkO1xuICAgIC8vIFNldCBkaXYgY29udGVudCArIHNob3cgZGl2XG4gICAgJChcIiNleGFtcGxlX2NvZGVcIikuaHRtbCggRVhBTVBMRV9DT0RFU1sgZXhhbXBsZUlkIF0gKTtcbiAgICAkKFwiI2V4YW1wbGVfem9uZVwiKS5zaG93KCA0MDAgKTsgIC8vIG1zXG59XG5cblxuLy8gLS0tIFRyYW5zZmVyIHRoZSBjb2RlIHRvIHRoZSBlZGl0b3JcbmZ1bmN0aW9uIHRyYW5zZmVyRXhhbXBsZUNvZGVUb0VkaXRvcigpXG57XG4gICAgLy8gU2F2ZSBjdXJyZW50IGNvZGUhXG4gICAgc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2UoKTtcblxuICAgIC8vIEhpZGUgdGhlIGV4YW1wbGUgem9uZVxuICAgICQoXCIjZXhhbXBsZV96b25lXCIpLmhpZGUoIDMwMCApO1xuXG4gICAgLy8gVHJhbnNmZXIgaW4gZWRpdG9yXG4gICAgY29kZU1pcnJvckVkaXRvci5zZXRWYWx1ZSggRVhBTVBMRV9DT0RFU1sgY3VycmVudEV4YW1wbGVDb2RlSWREaXNwbGF5ZWQgXS50b1N0cmluZygpICk7XG59XG5cblxuZXhwb3J0cy5pbml0RXhhbXBsZXNCdXR0b25zID0gaW5pdEV4YW1wbGVzQnV0dG9ucztcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gR2xvYmFsIFdlYlNvY2tldCBmcm9tIHRoZSBicm93c2VyIHRvIHRoZSBSUGksIHdoaWNoIGhhbmRsZXMgYmktZGlyIGNvbW11bmljYXRpb25zLiBEZWZpbmVkIGluIHRoZSB3ZWJwYWdlLlxuLy8gdmFyIGJyb3dzZXJXZWJTb2NrZXQgPSBudWxsO1xuXG4vLyA9PT09PSBNb2R1bGVzIFJlcXVpcmVkID09PT09XG52YXIgaW5pdEJyb3dzZXJTb2NrZXQgICA9IHJlcXVpcmUoJy4vc29ja2V0JykuaW5pdEJyb3dzZXJTb2NrZXQ7XG52YXIgaW5pdEVkaXRvckJ1dHRvbnMgICA9IHJlcXVpcmUoJy4vanMtZWRpdG9yJykuaW5pdEVkaXRvckJ1dHRvbnM7XG52YXIgaW5pdEV4YW1wbGVzQnV0dG9ucyA9IHJlcXVpcmUoJy4vZXhhbXBsZS1idXR0b25zJykuaW5pdEV4YW1wbGVzQnV0dG9ucztcbnZhciBpbml0VXNlck5hbWUgICAgICAgID0gcmVxdWlyZSgnLi91c2VyLW5hbWUnKS5pbml0VXNlck5hbWU7XG5cbi8vID09PT09IFN0YXJ0IG9mIHRoZSBtYWluIHBhZ2UgPT09PT1cbiQoZG9jdW1lbnQpLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuICAgIC8vIC0tLSBJbml0aWFsaXplIGFsbCB0aGUgdmlld3NcbiAgICAvLyBpbml0Vmlld3MoKTtcblxuICAgIC8vIC0tLSBTdGFydCB0aGUgV2ViU29ja2V0IGJldHdlZW4gdGhlIGJyb3dzZXIgYW5kIHRoZSBSUGlcbiAgICBicm93c2VyV2ViU29ja2V0ID0gaW5pdEJyb3dzZXJTb2NrZXQoKTtcblxuICAgIC8vIC0tLSBJbml0IHRoZSBiZWhhdmlvdXIgb2YgYnV0dG9ucyBmb3IgdGhlIEpTIGVkaXRvclxuICAgIGluaXRFZGl0b3JCdXR0b25zKCk7XG4gICAgLy9cbiAgICBpbml0RXhhbXBsZXNCdXR0b25zKCk7XG4gICAgLy9cbiAgICBpbml0VXNlck5hbWUoKTtcbn0pO1xuXG5cbi8vIFNhdmUgbW9kZWxzIHRvIGxvY2Fsc3RvcmFnZVxuLy8gbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3RvdG8nLCBKU09OLnN0cmluZ2lmeShcInRvdG9cIikpO1xuXG4vLyQuc3Vic2NyaWJlKCdyZXNldHNjcmVlbicsIGZ1bmN0aW9uKCkge1xuLy8gICQoJyNyZXN1bHQnKS50ZXh0KCcnKTtcbi8vICAkKCcuZXJyb3Itcm93JykuaGlkZSgpO1xuLy99KTtcbiIsIi8qKlxuICogIE1hbmFnZXMgdGhlIEpTIGVkaXRvciAoQ29kZU1pcnJvciBpbiB0aGlzIHByb2plY3QpXG4gKi9cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKTtcblxuLy8gVG8gYXZvaWQgZG91YmxlLWNsaWNrc1xudmFyIGxhc3RDbGlja09uUHVzaFRvU3BoZXJvICAgICA9IG51bGw7XG52YXIgbGFzdENsaWNrT25TdG9wU3BoZXJvICAgICAgID0gbnVsbDtcbi8vIFRvIGF2b2lkIGR1cGxpY2F0ZSBzYXZlc1xudmFyIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gPSBudWxsO1xuXG5cbmZ1bmN0aW9uIGluaXRFZGl0b3JCdXR0b25zKClcbntcbiAgICAvLyBMaXN0ZW5lcnNcbiAgICAkKFwiI3B1c2hfdG9fc3BoZXJvXCIpLm9uKFwiY2xpY2tcIiwgcHVzaFRvU3BoZXJvT25DbGljayApOyAgICAgICAgICAgICAgICAgICAgICAvLyBmdW5jdGlvbigpIHsgcHVzaFRvU3BoZXJvT25DbGljayggYnJvd3NlcldlYlNvY2tldCk7IH0pO1xuICAgICQoXCIjc3RvcF9zcGhlcm9cIikub24oXCJjbGlja1wiLCAgICBzdG9wU3BoZXJvT25DbGljayApO1xuXG4gICAgLy8gU2F2ZSBvbiB1bmxvYWRcbiAgICAkKHdpbmRvdykub24oXCJ1bmxvYWRcIiwgc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2UgKTtcblxuICAgIC8vIE9ubG9hZCwgY2hhcmdlIHRoZSBwcmV2aW91cyBjb2RlLCBvciBkZWZhdWx0LmpzXG4gICAgbG9hZEVkaXRvckZpcnN0Q29kZSgpO1xuXG4gICAgLy8gSW50ZXJ2YWwgdG8gcmVjb3JkIGNvZGUgaGlzdG9yeSwgd2hlbiB0aGVyZSBhcmUgY2hhbmdlcywgaW4gbG9jYWwgc3RvcmFnZSxcbiAgICAvLyAgZXZlcnkgbWludXRlIGF0IG1vc3QsIGtlZXAgdGhlIGxhc3QgNTAgbWF4IG9mIGNvZGVzIHBvc3RlZCAodGhleSBzaG91bGQgYmUgc3RvcmVkIG9uIFJQaSlcbiAgICBzZXRJbnRlcnZhbCggc2F2ZUNvZGVFdmVyeU1pbnV0ZVRvTG9jYWxTdG9yYWdlLCA2MDAwMCApO1xuICAgIHJldHVybjtcbn1cblxuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIGxvYWRFZGl0b3JGaXJzdENvZGUoKVxue1xuICAgIC8vIElzIHRoZXJlIG9uZSBpbiBsb2NhbFN0b3JhZ2U/XG4gICAgdmFyIGNvZGVMaXN0ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJjb2RlTGlzdFwiKTtcbiAgICBjb2RlTGlzdCA9ICggY29kZUxpc3QgKSA/IEpTT04ucGFyc2UoIGNvZGVMaXN0ICkgOiBudWxsO1xuXG4gICAgaWYgKCBjb2RlTGlzdCAmJiBjb2RlTGlzdC5sZW5ndGggPj0gMSkge1xuICAgICAgICB2YXIgc3RvcmVkQ29kZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCBjb2RlTGlzdFtjb2RlTGlzdC5sZW5ndGggLSAxXSApO1xuICAgICAgICBzdG9yZWRDb2RlID0gKCBzdG9yZWRDb2RlICkgPyBKU09OLnBhcnNlKCBzdG9yZWRDb2RlICkgOiBudWxsO1xuICAgICAgICBpZiAoIHN0b3JlZENvZGUgKSB7XG4gICAgICAgICAgICBjb2RlTWlycm9yRWRpdG9yLnNldFZhbHVlKCBzdG9yZWRDb2RlICk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgbG9hZCBkZWZhdWx0LmpzXG4gICAgJC5nZXQoJy9qcy9jb2RlLWV4YW1wbGVzL2RlZmF1bHQuanMnLCBmdW5jdGlvbiggZGF0YSApIHtcbiAgICAgICAgY29kZU1pcnJvckVkaXRvci5zZXRWYWx1ZSggZGF0YS50b1N0cmluZygpICk7XG4gICAgfSk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gcHVzaFRvU3BoZXJvT25DbGljaygpXG57XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgaWYgKCBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyAmJiAobm93IC0gbGFzdENsaWNrT25QdXNoVG9TcGhlcm8pIDwgNTAwMCApIHtcbiAgICAgICAgY29uc29sZS5sb2coIFwicHVzaFRvU3BoZXJvT25DbGljayBjbGlja2VkIHR3aWNlIHdpdGhpbiA1IHNlY29uZHMuIElnbm9yaW5nIVwiICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdENsaWNrT25QdXNoVG9TcGhlcm8gPSBub3c7XG5cbiAgICAvLyAtLS0gVHJhbnNmZXIgdGhlIENPREUgdG8gUlBpXG4gICAgdmFyIHVzZXJDb2RlID0gY29kZU1pcnJvckVkaXRvci5nZXRWYWx1ZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb2RlTWlycm9yRWRpdG9yIGdsb2JhbCB2YXJcbiAgICAvL1xuICAgIC8vICBGSVhNRTogc3BoZXJvSW5kZXggISEhISBGSVhNRSAhISEhXG4gICAgdmFyIG15SW5kZXggPSAwO1xuICAgIC8vXG4gICAgYnJvd3NlcldlYlNvY2tldC5zZW5kKCBKU09OLnN0cmluZ2lmeSggeyBcImFjdGlvblwiOiBcInB1c2gtY29kZVwiLCBcInNwaGVyb0luZGV4XCI6IG15SW5kZXggLCBcInVzZXJDb2RlXCI6IHVzZXJDb2RlIH0gKSk7ICAvLyBicm93c2VyV2ViU29ja2V0IGdsb2JhbCB2YXJcblxuICAgIC8vIC0tLSBTYXZlIHVzZXJDb2RlIHRvIGxvY2FsU3RvcmFnZVxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gc3RvcFNwaGVyb09uQ2xpY2soKVxue1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIGlmICggbGFzdENsaWNrT25TdG9wU3BoZXJvICYmIChub3cgLSBsYXN0Q2xpY2tPblN0b3BTcGhlcm8pIDwgNTAwMCApIHtcbiAgICAgICAgY29uc29sZS5sb2coIFwicHVzaFRvU3BoZXJvT25DbGljayBjbGlja2VkIHR3aWNlIHdpdGhpbiA1IHNlY29uZHMuIElnbm9yaW5nIVwiICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdENsaWNrT25TdG9wU3BoZXJvID0gbm93O1xuXG4gICAgLy8gIEZJWE1FOiBzcGhlcm9JbmRleCAhISEhIEZJWE1FICEhISFcbiAgICB2YXIgbXlJbmRleCA9IDA7XG4gICAgLy9cblxuICAgIC8vIC0tLSBUcmFuc2ZlciB0aGUgU1RPUCBjb21tYW5kIHRvIFJQaVxuICAgIGJyb3dzZXJXZWJTb2NrZXQuc2VuZCggSlNPTi5zdHJpbmdpZnkoIHsgXCJhY3Rpb25cIjpcInN0b3AtY29kZVwiLCBcInNwaGVyb0luZGV4XCI6IG15SW5kZXggfSApKTsgICAgICAgICAvLyBicm93c2VyV2ViU29ja2V0IGdsb2JhbCB2YXJcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzYXZlQ29kZUV2ZXJ5TWludXRlVG9Mb2NhbFN0b3JhZ2UoKVxue1xuICAgIGlmICggbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiAmJiBjb2RlTWlycm9yRWRpdG9yLmlzQ2xlYW4oIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gKSApIHtcbiAgICAgICAgLy8gTm8gbmVlZCB0byBzYXZlLCBubyBjaGFuZ2VzXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gT3R3IHNhdmUgdG8gbG9jYWxTdG9yYWdlXG4gICAgc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2UoKTtcbn1cblxuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlIClcbntcbiAgICB2YXIgaXRlbU5hbWUgPSBcImNvZGUtXCIgKyBEYXRlLm5vdygpO1xuICAgIC8vIC0tLSBTYXZlIHVzZXJDb2RlIHRvIGxvY2FsU3RvcmFnZVxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCBpdGVtTmFtZSwgSlNPTi5zdHJpbmdpZnkodXNlckNvZGUpICk7XG4gICAgdmFyIGNvZGVMaXN0ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJjb2RlTGlzdFwiKTtcbiAgICBjb2RlTGlzdCA9ICggY29kZUxpc3QgKSA/IEpTT04ucGFyc2UoIGNvZGVMaXN0ICkgOiBbXTtcbiAgICBjb2RlTGlzdC5wdXNoKCBpdGVtTmFtZSApO1xuICAgIGlmIChjb2RlTGlzdC5sZW5ndGggPiA1MCkgeyAgICAgICAgICAgICAvLyBQcmV2ZW50IGl0IGZyb20gZ2V0dGluZyB0b28gYmlnIVxuICAgICAgICB2YXIgZmlyc3RJdGVtTmFtZSA9IGNvZGVMaXN0LnNoaWZ0KCk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCBmaXJzdEl0ZW1OYW1lICk7XG4gICAgfVxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCBcImNvZGVMaXN0XCIsIEpTT04uc3RyaW5naWZ5KGNvZGVMaXN0KSApO1xuICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIHNhdmVcbiAgICBsYXN0Q29udGVudFNhdmVFZGl0b3JHZW5lcmF0aW9uID0gY29kZU1pcnJvckVkaXRvci5jaGFuZ2VHZW5lcmF0aW9uKCk7XG4gICAgcmV0dXJuO1xufVxuXG4vLyBTaG9ydGN1dFxuZnVuY3Rpb24gc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2UoKVxue1xuICAgIHZhciB1c2VyQ29kZSA9IGNvZGVNaXJyb3JFZGl0b3IuZ2V0VmFsdWUoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29kZU1pcnJvckVkaXRvciBnbG9iYWwgdmFyXG4gICAgc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZSggdXNlckNvZGUgKTtcbn1cblxuXG5cbmV4cG9ydHMuaW5pdEVkaXRvckJ1dHRvbnMgPSBpbml0RWRpdG9yQnV0dG9ucztcbmV4cG9ydHMuc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2UgPSBzYXZlQ3VycmVudEVkaXRvckNvZGVUb0xvY2FsU3RvcmFnZTtcbiIsIi8qKlxuICogIEhhbmRsZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBmcm9tIGJyb3dzZXIgdG8gUmFzcGJlcnJ5IFBpXG4gKi9cbi8vdmFyICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuZnVuY3Rpb24gaW5pdEJyb3dzZXJTb2NrZXQoKVxue1xuICAgdmFyIHNvY2tldDtcbiAgIHZhciBsb2MgPSB3aW5kb3cubG9jYXRpb247XG4gICB2YXIgdXJsID0gJ3dzOi8vJysgbG9jLmhvc3RuYW1lKyhsb2MucG9ydCA/ICc6Jytsb2MucG9ydDogJycpICsnL3dzL3VzZXJjb2RpbmcvJysgKGxvYy5zZWFyY2ggPyBsb2Muc2VhcmNoIDogJycpOyAvLyBGb3J3YXJkIHVybCBwYXJhbWV0ZXJzXG4gICBjb25zb2xlLmxvZygnU29ja2V0IFVSTCA9ICcsIHVybCk7XG5cbiAgIC8vIC0tLSB1dGlsc1xuICAgdmFyIG8gICAgICAgICA9ICQoe30pO1xuICAgJC5zdWJzY3JpYmUgICA9IG8ub24uYmluZChvKTtcbiAgICQudW5zdWJzY3JpYmUgPSBvLm9mZi5iaW5kKG8pO1xuICAgJC5wdWJsaXNoICAgICA9IG8udHJpZ2dlci5iaW5kKG8pO1xuXG5cbiAgIC8vIC0tLSBPcGVuIHNvY2tldFxuICAgdHJ5IHtcbiAgICAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG4gICB9IGNhdGNoKGV4Yykge1xuICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgV1MgY29ubmVjdGlvbiBlcnJvcjogJywgZXhjKTtcbiAgIH1cblxuICAgc29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICQuc3Vic2NyaWJlKCdzb2NrZXRzdG9wJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICB9KTtcbiAgICAgICAvLy8gc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICAgfTtcblxuXG4gICAgIC8vIC0tLS0tLS0gSGVyZSB3ZSBnZXQgdGhlIGluZm8hXG4gICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIHZhciBkYXRhT2JqID0gSlNPTi5wYXJzZSggZXZ0LmRhdGEgKTtcbiAgICAgICAgIGlmIChkYXRhT2JqLmVycm9yKSB7XG4gICAgICAgICAgICAgLy8vIHNob3dFcnJvcihtc2cuZXJyb3IpO1xuICAgICAgICAgICAgICQucHVibGlzaCgnc29ja2V0c3RvcCcpO1xuICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgIH1cbiAgICAgICAgIC8vIC0tLSBUaGlzIGlzIHRoZSBuZXcgYmVzdCB3b3JkcyBhcnJheVxuICAgICAgICAgLy8gRklYTUVcbiAgICAgICAgIHZhciBqc29uQnJvd3NlciA9IGRhdGFPYmo7XG4gICAgICAgICBpZiAoanNvbkJyb3dzZXIpIHtcbiAgICAgICAgICAgICBpZiAoanNvbkJyb3dzZXIucmVzdWx0c1swXS5maW5hbCkge1xuICAgICAgICAgICAgICAgICAvLyBnbG9iYWwgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgdXBkYXRlRmluYWxCcm93c2VyKCBqc29uQnJvd3NlciApO1xuICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIC8vIGdsb2JhbCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICB1cGRhdGVJbnRlcmltQnJvd3NlcigganNvbkJyb3dzZXIgKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9ubWVzc2FnZSBqc29uQnJvd3NlciBFTVBUWSAnLCBldnQpO1xuICAgICAgICAgfVxuICAgICAgICAgcmV0dXJuO1xuICAgICB9O1xuXG5cbiAgICAgLy8gLS0tIEVycm9yICYgQ2xvc2luZ1xuICAgICBzb2NrZXQub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmVycm9yIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgLy8vIHNob3dFcnJvcignQXBwbGljYXRpb24gZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgIC8vIFRPRE8gPz8gQ2xvc2UgPz8gLy8gJC5wdWJsaXNoKCdzb2NrZXRzdG9wJyk7XG4gICAgIH07XG5cbiAgICAgc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIFdTIG9uY2xvc2U6ICcsIGV2dCk7XG4gICAgICAgICBpZiAoZXZ0LmNvZGUgPiAxMDAwKSB7XG4gICAgICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmNsb3NlIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgICAgIC8vIHNob3dFcnJvcignU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAgICAgLy8gcmV0dXJuIGZhbHNlO1xuICAgICAgICAgfVxuICAgICAgICAgLy8gTWFkZSBpdCB0aHJvdWdoLCBub3JtYWwgY2xvc2VcbiAgICAgICAgICQudW5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnKTtcbiAgICAgfTtcblxuICAgICByZXR1cm4gc29ja2V0O1xufVxuXG5leHBvcnRzLmluaXRCcm93c2VyU29ja2V0ID0gaW5pdEJyb3dzZXJTb2NrZXQ7XG4iLCIvKipcbiAqICBVSSBvbiBVc2VyIE5hbWUgKyBpdHMgcmVwZXJjdXNzaW9uc1xuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKTtcblxuLy8gQXJyYXkgb2YgaWRzXG52YXIgU1RVREVOVF9GQU5DWV9OQU1FUyA9IFtcbiAgICBcIk1hbWEgQmVhclwiLCBcIlBhcGEgQmVhclwiLCBcIklyb24gUGFjbWFuXCIsIFwiUGhpbmVhcyBCZXJmXCIsIFwiU3R1YXJ0IE1pbmlvblwiLFxuICAgIFwiRmxhc2ggQ29yZG9uXCIsIFwiQ2hlZiBTYXlyYW1cIiwgXCJNYXJjdXMgTGVtb25cIiwgXCJMaW9uIE1lc3N5XCIsIFwiRWxzYSBGcm96aW5cIixcbiAgICBcIkNsb3duIEJvem9cIiwgXCJSYWJiaSBKYWNvYlwiXG5dO1xuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIGluaXRVc2VyTmFtZSgpXG57XG4gICAgbG9hZFN0dWRlbnROYW1lKCk7XG5cbiAgICAvLyBMaXN0ZW5lcnNcbiAgICAkKFwiI3N0dWRlbnRfbmFtZVwiKS5vbihcImNoYW5nZVwiLCBzYXZlU3R1ZGVudE5hbWUgKTsgICAgICAgICAgICAgICAgICAgICAgLy8gZnVuY3Rpb24oKSB7IHB1c2hUb1NwaGVyb09uQ2xpY2soIGJyb3dzZXJXZWJTb2NrZXQpOyB9KTtcblxuICAgIHJldHVybjtcbn1cblxuXG5mdW5jdGlvbiBsb2FkU3R1ZGVudE5hbWUoKVxue1xuICAgIHZhciBuYW0gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInN0dWRlbnROYW1lXCIpO1xuICAgIGlmICghbmFtKSB7XG4gICAgICAgIG5hbSA9IFNUVURFTlRfRkFOQ1lfTkFNRVNbIE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiBTVFVERU5UX0ZBTkNZX05BTUVTLmxlbmd0aCApIF07XG4gICAgfVxuICAgICQoXCIjc3R1ZGVudF9uYW1lXCIpLnZhbCggbmFtICk7XG59XG5cbmZ1bmN0aW9uIHNhdmVTdHVkZW50TmFtZSgpXG57XG4gICAgdmFyIG5hbSA9ICQoXCIjc3R1ZGVudF9uYW1lXCIpLnZhbCgpO1xuICAgIGlmIChuYW0pIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oIFwic3R1ZGVudE5hbWVcIiwgbmFtICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oIFwic3R1ZGVudE5hbWVcIiApO1xuICAgIH1cbn1cblxuXG5cbmV4cG9ydHMuaW5pdFVzZXJOYW1lID0gaW5pdFVzZXJOYW1lO1xuIl19
