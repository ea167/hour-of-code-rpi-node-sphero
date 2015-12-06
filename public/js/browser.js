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
var initSelectSphero    = require('./select-sphero').initSelectSphero;

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

    $.subscribe('hoc_color', initSelectSphero );
});


// Save models to localstorage
// localStorage.setItem('toto', JSON.stringify("toto"));

//$.subscribe('resetscreen', function() {
//  $('#result').text('');
//  $('.error-row').hide();
//});

},{"./example-buttons":1,"./js-editor":3,"./select-sphero":4,"./socket":5,"./user-name":6}],3:[function(require,module,exports){
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
    var myIndex = $("#rpi_sphero").val();
    if (!myIndex) myIndex = 0;
    //
    var studentName = $("#student_name").val();

    // Send the code!
    browserWebSocket.send( JSON.stringify( {
        "action": "push-code",
        "spheroIsDark": (!myIndex),         // FIXME
        "studentName": studentName,
        "userCode": userCode } )
    );  // browserWebSocket global var

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

    var myIndex = $("#rpi_sphero").val();
    //
    var studentName = $("#student_name").val();

    // --- Transfer the STOP command to RPi
    browserWebSocket.send( JSON.stringify( { "action":"stop-code", "studentName": studentName, "spheroIsDark": (!myIndex) } ));  // FIXME       // browserWebSocket global var
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
(function (global){
/**
 *  UI on User Name + its repercussions
 */

var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);


/**
 * HOC_COLOR is globally positioned (in the html page)
 */
function initSelectSphero()
{
    setSelectSpheroColor();
    loadSpheroChoice();

    // Listeners
    $("#rpi_sphero").on("change", saveSpheroChoice );
    return;
}


function setSelectSpheroColor()
{
    if (HOC_COLOR != "red" && HOC_COLOR != "green" && HOC_COLOR != "blue" && HOC_COLOR != "yellow" && HOC_COLOR != "purple" ) {
        console.error( "HOC_COLOR has wrong value: " + HOC_COLOR );
        return;
    }

    // Set the right color to the select box
    $("#rpi_sphero").removeClass( "red-bg-txt green-bg-txt blue-bg-txt yellow-bg-txt purple-bg-txt" );
    $("#rpi_sphero option").removeClass( "red-bg-txt green-bg-txt blue-bg-txt yellow-bg-txt purple-bg-txt" );
    $("#rpi_sphero").addClass( HOC_COLOR + "-bg-txt" );
    $("#rpi_sphero option").addClass( HOC_COLOR + "-bg-txt" );

    $("#rpi_sphero option[value='0']").text("Sphero Dark "+ HOC_COLOR );
    $("#rpi_sphero option[value='1']").text("Sphero Light "+ HOC_COLOR );
    return;
}


function loadSpheroChoice()
{
    var idx = localStorage.getItem("spheroIdx");
    if (!idx) {
        idx = 0;
    }
    $("#rpi_sphero").val( idx );
}

function saveSpheroChoice()
{
    var idx = $("#rpi_sphero").val();
    localStorage.setItem( "spheroIdx", idx );
}


exports.initSelectSphero = initSelectSphero;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
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
         // --- This is the RPi/Sphero color
         if (dataObj.HOC_COLOR) {
             HOC_COLOR = dataObj.HOC_COLOR;             // defined in the html page
             $.publish('hoc_color');
         }

         /*
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
         } */
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

},{}],6:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvZXhhbXBsZS1idXR0b25zLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9qcy1lZGl0b3IuanMiLCJzcmMvYnJvd3Nlci9zZWxlY3Qtc3BoZXJvLmpzIiwic3JjL2Jyb3dzZXIvc29ja2V0LmpzIiwic3JjL2Jyb3dzZXIvdXNlci1uYW1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogIEhhbmRsZSB0aGUgY2xpY2tzIG9uIHRoZSBleGFtcGxlIGJ1dHRvbnMgYW5kIHRoZSBsb2FkaW5nIG9mIHRoZSBjb2RlIGluIHRoZSBKUyBlZGl0b3JcbiAqL1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpO1xuXG52YXIgc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2UgPSByZXF1aXJlKFwiLi9qcy1lZGl0b3JcIikuc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2U7XG5cbi8vIEFycmF5IG9mIGlkc1xudmFyIEVYQU1QTEVfQ09ERV9JRFMgPSBbXG4gICAgXCJiZWdpbm5lcjFcIiwgXCJiZWdpbm5lcjJcIiwgXCJiZWdpbm5lcjNcIiwgXCJiZWdpbm5lcjRcIiwgXCJiZWdpbm5lcjVcIixcbiAgICBcImFkdmFuY2VkMVwiLCBcImFkdmFuY2VkMlwiLCBcImFkdmFuY2VkM1wiXG5dO1xuXG4vLyBLZXkgPSBodG1sIGlkLCBWYWx1ZSA9IHRleHQgb2YgdGhlIGNvZGVcbnZhciBFWEFNUExFX0NPREVTID0gW107XG5cbi8vIFRoZSBvbmUgY3VycmVudGx5IGRpc3BsYXllZCBpbiB0aGUgZXhhbXBsZSB6b25lIChtYXkgYmUgbnVsbClcbnZhciBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZDtcblxuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIGluaXRFeGFtcGxlc0J1dHRvbnMoKVxue1xuICAgIC8vIEZvciBhbGwgZXhhbXBsZXNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEVYQU1QTEVfQ09ERV9JRFMubGVuZ3RoOyBpKysgKSB7XG4gICAgICAgIHZhciBleGFtcGxlSWQgPSBFWEFNUExFX0NPREVfSURTW2ldO1xuXG4gICAgICAgIC8vIC0tLSBEb3dubG9hZCB0aGUgZXhhbXBsZSBhcyBhamF4IGFuZCBzdG9yZSBpdCBhcyBhc3NvY2lhdGl2ZSBhcnJheVxuICAgICAgICBkb3dubG9hZEV4YW1wbGVDb2RlKCBleGFtcGxlSWQgKTtcblxuICAgICAgICAvLyAtLS0gQWRkIGxpc3RlbmVyc1xuICAgICAgICAkKFwiI1wiK2V4YW1wbGVJZCkub24oXCJjbGlja1wiLCBmdW5jdGlvbihleElkKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHNob3dFeGFtcGxlQXJlYShleElkKTsgfVxuICAgICAgICB9KGV4YW1wbGVJZCkgKTsgICAgICAgICAgICAgICAvLyBPdHcga2VlcHMgdGhlIGxhdGVzdCB2YWx1ZSBvZiBleGFtcGxlSWRcbiAgICB9XG5cbiAgICAvLyAtLS0gQmluZCB0aGUgaGlkZSAvIGVkaXQgY29kZSBidXR0b25zXG4gICAgJChcIiNoaWRlX2V4YW1wbGVfem9uZVwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyAkKFwiI2V4YW1wbGVfem9uZVwiKS5oaWRlKCAzMDAgKTsgfSk7ICAgLy8gbXNcblxuICAgICQoXCIjcHV0X2V4YW1wbGVfaW5fZWRpdG9yXCIpLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7IHRyYW5zZmVyRXhhbXBsZUNvZGVUb0VkaXRvcigpOyB9KTtcbiAgICByZXR1cm47XG59XG5cblxuLy8gLS0tIERvd25sb2FkIGFsbCBleGFtcGxlcyBsb2NhbGx5IHRocm91Z2ggYWpheFxuZnVuY3Rpb24gZG93bmxvYWRFeGFtcGxlQ29kZSggZXhhbXBsZUlkIClcbntcbiAgICAvLyBEb3dubG9hZCBhbmQgU2F2ZSBpdFxuICAgICQuZ2V0KCcvanMvY29kZS1leGFtcGxlcy8nKyBleGFtcGxlSWQgKycuanMnLCBmdW5jdGlvbiggZGF0YSApIHtcbiAgICAgICAgRVhBTVBMRV9DT0RFU1sgZXhhbXBsZUlkIF0gPSBkYXRhO1xuICAgIH0pO1xufVxuXG5cbi8vIC0tLSBTaG93IHRoZSBjb2RlIGluIHRoZSBleGFtcGxlIGFyZWFcbmZ1bmN0aW9uIHNob3dFeGFtcGxlQXJlYSggZXhhbXBsZUlkIClcbntcbiAgICBjdXJyZW50RXhhbXBsZUNvZGVJZERpc3BsYXllZCA9IGV4YW1wbGVJZDtcbiAgICAvLyBTZXQgZGl2IGNvbnRlbnQgKyBzaG93IGRpdlxuICAgICQoXCIjZXhhbXBsZV9jb2RlXCIpLmh0bWwoIEVYQU1QTEVfQ09ERVNbIGV4YW1wbGVJZCBdICk7XG4gICAgJChcIiNleGFtcGxlX3pvbmVcIikuc2hvdyggNDAwICk7ICAvLyBtc1xufVxuXG5cbi8vIC0tLSBUcmFuc2ZlciB0aGUgY29kZSB0byB0aGUgZWRpdG9yXG5mdW5jdGlvbiB0cmFuc2ZlckV4YW1wbGVDb2RlVG9FZGl0b3IoKVxue1xuICAgIC8vIFNhdmUgY3VycmVudCBjb2RlIVxuICAgIHNhdmVDdXJyZW50RWRpdG9yQ29kZVRvTG9jYWxTdG9yYWdlKCk7XG5cbiAgICAvLyBIaWRlIHRoZSBleGFtcGxlIHpvbmVcbiAgICAkKFwiI2V4YW1wbGVfem9uZVwiKS5oaWRlKCAzMDAgKTtcblxuICAgIC8vIFRyYW5zZmVyIGluIGVkaXRvclxuICAgIGNvZGVNaXJyb3JFZGl0b3Iuc2V0VmFsdWUoIEVYQU1QTEVfQ09ERVNbIGN1cnJlbnRFeGFtcGxlQ29kZUlkRGlzcGxheWVkIF0udG9TdHJpbmcoKSApO1xufVxuXG5cbmV4cG9ydHMuaW5pdEV4YW1wbGVzQnV0dG9ucyA9IGluaXRFeGFtcGxlc0J1dHRvbnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEdsb2JhbCBXZWJTb2NrZXQgZnJvbSB0aGUgYnJvd3NlciB0byB0aGUgUlBpLCB3aGljaCBoYW5kbGVzIGJpLWRpciBjb21tdW5pY2F0aW9ucy4gRGVmaW5lZCBpbiB0aGUgd2VicGFnZS5cbi8vIHZhciBicm93c2VyV2ViU29ja2V0ID0gbnVsbDtcblxuLy8gPT09PT0gTW9kdWxlcyBSZXF1aXJlZCA9PT09PVxudmFyIGluaXRCcm93c2VyU29ja2V0ICAgPSByZXF1aXJlKCcuL3NvY2tldCcpLmluaXRCcm93c2VyU29ja2V0O1xudmFyIGluaXRFZGl0b3JCdXR0b25zICAgPSByZXF1aXJlKCcuL2pzLWVkaXRvcicpLmluaXRFZGl0b3JCdXR0b25zO1xudmFyIGluaXRFeGFtcGxlc0J1dHRvbnMgPSByZXF1aXJlKCcuL2V4YW1wbGUtYnV0dG9ucycpLmluaXRFeGFtcGxlc0J1dHRvbnM7XG52YXIgaW5pdFVzZXJOYW1lICAgICAgICA9IHJlcXVpcmUoJy4vdXNlci1uYW1lJykuaW5pdFVzZXJOYW1lO1xudmFyIGluaXRTZWxlY3RTcGhlcm8gICAgPSByZXF1aXJlKCcuL3NlbGVjdC1zcGhlcm8nKS5pbml0U2VsZWN0U3BoZXJvO1xuXG4vLyA9PT09PSBTdGFydCBvZiB0aGUgbWFpbiBwYWdlID09PT09XG4kKGRvY3VtZW50KS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cbiAgICAvLyAtLS0gSW5pdGlhbGl6ZSBhbGwgdGhlIHZpZXdzXG4gICAgLy8gaW5pdFZpZXdzKCk7XG5cbiAgICAvLyAtLS0gU3RhcnQgdGhlIFdlYlNvY2tldCBiZXR3ZWVuIHRoZSBicm93c2VyIGFuZCB0aGUgUlBpXG4gICAgYnJvd3NlcldlYlNvY2tldCA9IGluaXRCcm93c2VyU29ja2V0KCk7XG5cbiAgICAvLyAtLS0gSW5pdCB0aGUgYmVoYXZpb3VyIG9mIGJ1dHRvbnMgZm9yIHRoZSBKUyBlZGl0b3JcbiAgICBpbml0RWRpdG9yQnV0dG9ucygpO1xuICAgIC8vXG4gICAgaW5pdEV4YW1wbGVzQnV0dG9ucygpO1xuICAgIC8vXG4gICAgaW5pdFVzZXJOYW1lKCk7XG5cbiAgICAkLnN1YnNjcmliZSgnaG9jX2NvbG9yJywgaW5pdFNlbGVjdFNwaGVybyApO1xufSk7XG5cblxuLy8gU2F2ZSBtb2RlbHMgdG8gbG9jYWxzdG9yYWdlXG4vLyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndG90bycsIEpTT04uc3RyaW5naWZ5KFwidG90b1wiKSk7XG5cbi8vJC5zdWJzY3JpYmUoJ3Jlc2V0c2NyZWVuJywgZnVuY3Rpb24oKSB7XG4vLyAgJCgnI3Jlc3VsdCcpLnRleHQoJycpO1xuLy8gICQoJy5lcnJvci1yb3cnKS5oaWRlKCk7XG4vL30pO1xuIiwiLyoqXG4gKiAgTWFuYWdlcyB0aGUgSlMgZWRpdG9yIChDb2RlTWlycm9yIGluIHRoaXMgcHJvamVjdClcbiAqL1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpO1xuXG4vLyBUbyBhdm9pZCBkb3VibGUtY2xpY2tzXG52YXIgbGFzdENsaWNrT25QdXNoVG9TcGhlcm8gICAgID0gbnVsbDtcbnZhciBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gICAgICAgPSBudWxsO1xuLy8gVG8gYXZvaWQgZHVwbGljYXRlIHNhdmVzXG52YXIgbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiA9IG51bGw7XG5cblxuZnVuY3Rpb24gaW5pdEVkaXRvckJ1dHRvbnMoKVxue1xuICAgIC8vIExpc3RlbmVyc1xuICAgICQoXCIjcHVzaF90b19zcGhlcm9cIikub24oXCJjbGlja1wiLCBwdXNoVG9TcGhlcm9PbkNsaWNrICk7ICAgICAgICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uKCkgeyBwdXNoVG9TcGhlcm9PbkNsaWNrKCBicm93c2VyV2ViU29ja2V0KTsgfSk7XG4gICAgJChcIiNzdG9wX3NwaGVyb1wiKS5vbihcImNsaWNrXCIsICAgIHN0b3BTcGhlcm9PbkNsaWNrICk7XG5cbiAgICAvLyBTYXZlIG9uIHVubG9hZFxuICAgICQod2luZG93KS5vbihcInVubG9hZFwiLCBzYXZlQ3VycmVudEVkaXRvckNvZGVUb0xvY2FsU3RvcmFnZSApO1xuXG4gICAgLy8gT25sb2FkLCBjaGFyZ2UgdGhlIHByZXZpb3VzIGNvZGUsIG9yIGRlZmF1bHQuanNcbiAgICBsb2FkRWRpdG9yRmlyc3RDb2RlKCk7XG5cbiAgICAvLyBJbnRlcnZhbCB0byByZWNvcmQgY29kZSBoaXN0b3J5LCB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzLCBpbiBsb2NhbCBzdG9yYWdlLFxuICAgIC8vICBldmVyeSBtaW51dGUgYXQgbW9zdCwga2VlcCB0aGUgbGFzdCA1MCBtYXggb2YgY29kZXMgcG9zdGVkICh0aGV5IHNob3VsZCBiZSBzdG9yZWQgb24gUlBpKVxuICAgIHNldEludGVydmFsKCBzYXZlQ29kZUV2ZXJ5TWludXRlVG9Mb2NhbFN0b3JhZ2UsIDYwMDAwICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gbG9hZEVkaXRvckZpcnN0Q29kZSgpXG57XG4gICAgLy8gSXMgdGhlcmUgb25lIGluIGxvY2FsU3RvcmFnZT9cbiAgICB2YXIgY29kZUxpc3QgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvZGVMaXN0XCIpO1xuICAgIGNvZGVMaXN0ID0gKCBjb2RlTGlzdCApID8gSlNPTi5wYXJzZSggY29kZUxpc3QgKSA6IG51bGw7XG5cbiAgICBpZiAoIGNvZGVMaXN0ICYmIGNvZGVMaXN0Lmxlbmd0aCA+PSAxKSB7XG4gICAgICAgIHZhciBzdG9yZWRDb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oIGNvZGVMaXN0W2NvZGVMaXN0Lmxlbmd0aCAtIDFdICk7XG4gICAgICAgIHN0b3JlZENvZGUgPSAoIHN0b3JlZENvZGUgKSA/IEpTT04ucGFyc2UoIHN0b3JlZENvZGUgKSA6IG51bGw7XG4gICAgICAgIGlmICggc3RvcmVkQ29kZSApIHtcbiAgICAgICAgICAgIGNvZGVNaXJyb3JFZGl0b3Iuc2V0VmFsdWUoIHN0b3JlZENvZGUgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSBsb2FkIGRlZmF1bHQuanNcbiAgICAkLmdldCgnL2pzL2NvZGUtZXhhbXBsZXMvZGVmYXVsdC5qcycsIGZ1bmN0aW9uKCBkYXRhICkge1xuICAgICAgICBjb2RlTWlycm9yRWRpdG9yLnNldFZhbHVlKCBkYXRhLnRvU3RyaW5nKCkgKTtcbiAgICB9KTtcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBwdXNoVG9TcGhlcm9PbkNsaWNrKClcbntcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoIGxhc3RDbGlja09uUHVzaFRvU3BoZXJvICYmIChub3cgLSBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybykgPCA1MDAwICkge1xuICAgICAgICBjb25zb2xlLmxvZyggXCJwdXNoVG9TcGhlcm9PbkNsaWNrIGNsaWNrZWQgdHdpY2Ugd2l0aGluIDUgc2Vjb25kcy4gSWdub3JpbmchXCIgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyA9IG5vdztcblxuICAgIC8vIC0tLSBUcmFuc2ZlciB0aGUgQ09ERSB0byBSUGlcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIC8vXG4gICAgdmFyIG15SW5kZXggPSAkKFwiI3JwaV9zcGhlcm9cIikudmFsKCk7XG4gICAgaWYgKCFteUluZGV4KSBteUluZGV4ID0gMDtcbiAgICAvL1xuICAgIHZhciBzdHVkZW50TmFtZSA9ICQoXCIjc3R1ZGVudF9uYW1lXCIpLnZhbCgpO1xuXG4gICAgLy8gU2VuZCB0aGUgY29kZSFcbiAgICBicm93c2VyV2ViU29ja2V0LnNlbmQoIEpTT04uc3RyaW5naWZ5KCB7XG4gICAgICAgIFwiYWN0aW9uXCI6IFwicHVzaC1jb2RlXCIsXG4gICAgICAgIFwic3BoZXJvSXNEYXJrXCI6ICghbXlJbmRleCksICAgICAgICAgLy8gRklYTUVcbiAgICAgICAgXCJzdHVkZW50TmFtZVwiOiBzdHVkZW50TmFtZSxcbiAgICAgICAgXCJ1c2VyQ29kZVwiOiB1c2VyQ29kZSB9IClcbiAgICApOyAgLy8gYnJvd3NlcldlYlNvY2tldCBnbG9iYWwgdmFyXG5cbiAgICAvLyAtLS0gU2F2ZSB1c2VyQ29kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlKCB1c2VyQ29kZSApO1xuICAgIHJldHVybjtcbn1cblxuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIHN0b3BTcGhlcm9PbkNsaWNrKClcbntcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoIGxhc3RDbGlja09uU3RvcFNwaGVybyAmJiAobm93IC0gbGFzdENsaWNrT25TdG9wU3BoZXJvKSA8IDUwMDAgKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCBcInB1c2hUb1NwaGVyb09uQ2xpY2sgY2xpY2tlZCB0d2ljZSB3aXRoaW4gNSBzZWNvbmRzLiBJZ25vcmluZyFcIiApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGxhc3RDbGlja09uU3RvcFNwaGVybyA9IG5vdztcblxuICAgIHZhciBteUluZGV4ID0gJChcIiNycGlfc3BoZXJvXCIpLnZhbCgpO1xuICAgIC8vXG4gICAgdmFyIHN0dWRlbnROYW1lID0gJChcIiNzdHVkZW50X25hbWVcIikudmFsKCk7XG5cbiAgICAvLyAtLS0gVHJhbnNmZXIgdGhlIFNUT1AgY29tbWFuZCB0byBSUGlcbiAgICBicm93c2VyV2ViU29ja2V0LnNlbmQoIEpTT04uc3RyaW5naWZ5KCB7IFwiYWN0aW9uXCI6XCJzdG9wLWNvZGVcIiwgXCJzdHVkZW50TmFtZVwiOiBzdHVkZW50TmFtZSwgXCJzcGhlcm9Jc0RhcmtcIjogKCFteUluZGV4KSB9ICkpOyAgLy8gRklYTUUgICAgICAgLy8gYnJvd3NlcldlYlNvY2tldCBnbG9iYWwgdmFyXG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gc2F2ZUNvZGVFdmVyeU1pbnV0ZVRvTG9jYWxTdG9yYWdlKClcbntcbiAgICBpZiAoIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gJiYgY29kZU1pcnJvckVkaXRvci5pc0NsZWFuKCBsYXN0Q29udGVudFNhdmVFZGl0b3JHZW5lcmF0aW9uICkgKSB7XG4gICAgICAgIC8vIE5vIG5lZWQgdG8gc2F2ZSwgbm8gY2hhbmdlc1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIE90dyBzYXZlIHRvIGxvY2FsU3RvcmFnZVxuICAgIHNhdmVDdXJyZW50RWRpdG9yQ29kZVRvTG9jYWxTdG9yYWdlKCk7XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlKCB1c2VyQ29kZSApXG57XG4gICAgdmFyIGl0ZW1OYW1lID0gXCJjb2RlLVwiICsgRGF0ZS5ub3coKTtcbiAgICAvLyAtLS0gU2F2ZSB1c2VyQ29kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggaXRlbU5hbWUsIEpTT04uc3RyaW5naWZ5KHVzZXJDb2RlKSApO1xuICAgIHZhciBjb2RlTGlzdCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29kZUxpc3RcIik7XG4gICAgY29kZUxpc3QgPSAoIGNvZGVMaXN0ICkgPyBKU09OLnBhcnNlKCBjb2RlTGlzdCApIDogW107XG4gICAgY29kZUxpc3QucHVzaCggaXRlbU5hbWUgKTtcbiAgICBpZiAoY29kZUxpc3QubGVuZ3RoID4gNTApIHsgICAgICAgICAgICAgLy8gUHJldmVudCBpdCBmcm9tIGdldHRpbmcgdG9vIGJpZyFcbiAgICAgICAgdmFyIGZpcnN0SXRlbU5hbWUgPSBjb2RlTGlzdC5zaGlmdCgpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSggZmlyc3RJdGVtTmFtZSApO1xuICAgIH1cbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggXCJjb2RlTGlzdFwiLCBKU09OLnN0cmluZ2lmeShjb2RlTGlzdCkgKTtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBzYXZlXG4gICAgbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiA9IGNvZGVNaXJyb3JFZGl0b3IuY2hhbmdlR2VuZXJhdGlvbigpO1xuICAgIHJldHVybjtcbn1cblxuLy8gU2hvcnRjdXRcbmZ1bmN0aW9uIHNhdmVDdXJyZW50RWRpdG9yQ29kZVRvTG9jYWxTdG9yYWdlKClcbntcbiAgICB2YXIgdXNlckNvZGUgPSBjb2RlTWlycm9yRWRpdG9yLmdldFZhbHVlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvZGVNaXJyb3JFZGl0b3IgZ2xvYmFsIHZhclxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG59XG5cblxuXG5leHBvcnRzLmluaXRFZGl0b3JCdXR0b25zID0gaW5pdEVkaXRvckJ1dHRvbnM7XG5leHBvcnRzLnNhdmVDdXJyZW50RWRpdG9yQ29kZVRvTG9jYWxTdG9yYWdlID0gc2F2ZUN1cnJlbnRFZGl0b3JDb2RlVG9Mb2NhbFN0b3JhZ2U7XG4iLCIvKipcbiAqICBVSSBvbiBVc2VyIE5hbWUgKyBpdHMgcmVwZXJjdXNzaW9uc1xuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKTtcblxuXG4vKipcbiAqIEhPQ19DT0xPUiBpcyBnbG9iYWxseSBwb3NpdGlvbmVkIChpbiB0aGUgaHRtbCBwYWdlKVxuICovXG5mdW5jdGlvbiBpbml0U2VsZWN0U3BoZXJvKClcbntcbiAgICBzZXRTZWxlY3RTcGhlcm9Db2xvcigpO1xuICAgIGxvYWRTcGhlcm9DaG9pY2UoKTtcblxuICAgIC8vIExpc3RlbmVyc1xuICAgICQoXCIjcnBpX3NwaGVyb1wiKS5vbihcImNoYW5nZVwiLCBzYXZlU3BoZXJvQ2hvaWNlICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbmZ1bmN0aW9uIHNldFNlbGVjdFNwaGVyb0NvbG9yKClcbntcbiAgICBpZiAoSE9DX0NPTE9SICE9IFwicmVkXCIgJiYgSE9DX0NPTE9SICE9IFwiZ3JlZW5cIiAmJiBIT0NfQ09MT1IgIT0gXCJibHVlXCIgJiYgSE9DX0NPTE9SICE9IFwieWVsbG93XCIgJiYgSE9DX0NPTE9SICE9IFwicHVycGxlXCIgKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiSE9DX0NPTE9SIGhhcyB3cm9uZyB2YWx1ZTogXCIgKyBIT0NfQ09MT1IgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgcmlnaHQgY29sb3IgdG8gdGhlIHNlbGVjdCBib3hcbiAgICAkKFwiI3JwaV9zcGhlcm9cIikucmVtb3ZlQ2xhc3MoIFwicmVkLWJnLXR4dCBncmVlbi1iZy10eHQgYmx1ZS1iZy10eHQgeWVsbG93LWJnLXR4dCBwdXJwbGUtYmctdHh0XCIgKTtcbiAgICAkKFwiI3JwaV9zcGhlcm8gb3B0aW9uXCIpLnJlbW92ZUNsYXNzKCBcInJlZC1iZy10eHQgZ3JlZW4tYmctdHh0IGJsdWUtYmctdHh0IHllbGxvdy1iZy10eHQgcHVycGxlLWJnLXR4dFwiICk7XG4gICAgJChcIiNycGlfc3BoZXJvXCIpLmFkZENsYXNzKCBIT0NfQ09MT1IgKyBcIi1iZy10eHRcIiApO1xuICAgICQoXCIjcnBpX3NwaGVybyBvcHRpb25cIikuYWRkQ2xhc3MoIEhPQ19DT0xPUiArIFwiLWJnLXR4dFwiICk7XG5cbiAgICAkKFwiI3JwaV9zcGhlcm8gb3B0aW9uW3ZhbHVlPScwJ11cIikudGV4dChcIlNwaGVybyBEYXJrIFwiKyBIT0NfQ09MT1IgKTtcbiAgICAkKFwiI3JwaV9zcGhlcm8gb3B0aW9uW3ZhbHVlPScxJ11cIikudGV4dChcIlNwaGVybyBMaWdodCBcIisgSE9DX0NPTE9SICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbmZ1bmN0aW9uIGxvYWRTcGhlcm9DaG9pY2UoKVxue1xuICAgIHZhciBpZHggPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInNwaGVyb0lkeFwiKTtcbiAgICBpZiAoIWlkeCkge1xuICAgICAgICBpZHggPSAwO1xuICAgIH1cbiAgICAkKFwiI3JwaV9zcGhlcm9cIikudmFsKCBpZHggKTtcbn1cblxuZnVuY3Rpb24gc2F2ZVNwaGVyb0Nob2ljZSgpXG57XG4gICAgdmFyIGlkeCA9ICQoXCIjcnBpX3NwaGVyb1wiKS52YWwoKTtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSggXCJzcGhlcm9JZHhcIiwgaWR4ICk7XG59XG5cblxuZXhwb3J0cy5pbml0U2VsZWN0U3BoZXJvID0gaW5pdFNlbGVjdFNwaGVybztcbiIsIi8qKlxuICogIEhhbmRsZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBmcm9tIGJyb3dzZXIgdG8gUmFzcGJlcnJ5IFBpXG4gKi9cbi8vdmFyICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuZnVuY3Rpb24gaW5pdEJyb3dzZXJTb2NrZXQoKVxue1xuICAgdmFyIHNvY2tldDtcbiAgIHZhciBsb2MgPSB3aW5kb3cubG9jYXRpb247XG4gICB2YXIgdXJsID0gJ3dzOi8vJysgbG9jLmhvc3RuYW1lKyhsb2MucG9ydCA/ICc6Jytsb2MucG9ydDogJycpICsnL3dzL3VzZXJjb2RpbmcvJysgKGxvYy5zZWFyY2ggPyBsb2Muc2VhcmNoIDogJycpOyAvLyBGb3J3YXJkIHVybCBwYXJhbWV0ZXJzXG4gICBjb25zb2xlLmxvZygnU29ja2V0IFVSTCA9ICcsIHVybCk7XG5cbiAgIC8vIC0tLSB1dGlsc1xuICAgdmFyIG8gICAgICAgICA9ICQoe30pO1xuICAgJC5zdWJzY3JpYmUgICA9IG8ub24uYmluZChvKTtcbiAgICQudW5zdWJzY3JpYmUgPSBvLm9mZi5iaW5kKG8pO1xuICAgJC5wdWJsaXNoICAgICA9IG8udHJpZ2dlci5iaW5kKG8pO1xuXG5cbiAgIC8vIC0tLSBPcGVuIHNvY2tldFxuICAgdHJ5IHtcbiAgICAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG4gICB9IGNhdGNoKGV4Yykge1xuICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgV1MgY29ubmVjdGlvbiBlcnJvcjogJywgZXhjKTtcbiAgIH1cblxuICAgc29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICQuc3Vic2NyaWJlKCdzb2NrZXRzdG9wJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICB9KTtcbiAgICAgICAvLy8gc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICAgfTtcblxuXG4gICAgIC8vIC0tLS0tLS0gSGVyZSB3ZSBnZXQgdGhlIGluZm8hXG4gICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIHZhciBkYXRhT2JqID0gSlNPTi5wYXJzZSggZXZ0LmRhdGEgKTtcbiAgICAgICAgIGlmIChkYXRhT2JqLmVycm9yKSB7XG4gICAgICAgICAgICAgLy8vIHNob3dFcnJvcihtc2cuZXJyb3IpO1xuICAgICAgICAgICAgICQucHVibGlzaCgnc29ja2V0c3RvcCcpO1xuICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgIH1cbiAgICAgICAgIC8vIC0tLSBUaGlzIGlzIHRoZSBSUGkvU3BoZXJvIGNvbG9yXG4gICAgICAgICBpZiAoZGF0YU9iai5IT0NfQ09MT1IpIHtcbiAgICAgICAgICAgICBIT0NfQ09MT1IgPSBkYXRhT2JqLkhPQ19DT0xPUjsgICAgICAgICAgICAgLy8gZGVmaW5lZCBpbiB0aGUgaHRtbCBwYWdlXG4gICAgICAgICAgICAgJC5wdWJsaXNoKCdob2NfY29sb3InKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgLypcbiAgICAgICAgIHZhciBqc29uQnJvd3NlciA9IGRhdGFPYmo7XG4gICAgICAgICBpZiAoanNvbkJyb3dzZXIpIHtcbiAgICAgICAgICAgICBpZiAoanNvbkJyb3dzZXIucmVzdWx0c1swXS5maW5hbCkge1xuICAgICAgICAgICAgICAgICAvLyBnbG9iYWwgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgdXBkYXRlRmluYWxCcm93c2VyKCBqc29uQnJvd3NlciApO1xuICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIC8vIGdsb2JhbCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICB1cGRhdGVJbnRlcmltQnJvd3NlcigganNvbkJyb3dzZXIgKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9ubWVzc2FnZSBqc29uQnJvd3NlciBFTVBUWSAnLCBldnQpO1xuICAgICAgICAgfSAqL1xuICAgICAgICAgcmV0dXJuO1xuICAgICB9O1xuXG5cbiAgICAgLy8gLS0tIEVycm9yICYgQ2xvc2luZ1xuICAgICBzb2NrZXQub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmVycm9yIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgLy8vIHNob3dFcnJvcignQXBwbGljYXRpb24gZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgIC8vIFRPRE8gPz8gQ2xvc2UgPz8gLy8gJC5wdWJsaXNoKCdzb2NrZXRzdG9wJyk7XG4gICAgIH07XG5cbiAgICAgc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIFdTIG9uY2xvc2U6ICcsIGV2dCk7XG4gICAgICAgICBpZiAoZXZ0LmNvZGUgPiAxMDAwKSB7XG4gICAgICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmNsb3NlIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgICAgIC8vIHNob3dFcnJvcignU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAgICAgLy8gcmV0dXJuIGZhbHNlO1xuICAgICAgICAgfVxuICAgICAgICAgLy8gTWFkZSBpdCB0aHJvdWdoLCBub3JtYWwgY2xvc2VcbiAgICAgICAgICQudW5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnKTtcbiAgICAgfTtcblxuICAgICByZXR1cm4gc29ja2V0O1xufVxuXG5leHBvcnRzLmluaXRCcm93c2VyU29ja2V0ID0gaW5pdEJyb3dzZXJTb2NrZXQ7XG4iLCIvKipcbiAqICBVSSBvbiBVc2VyIE5hbWUgKyBpdHMgcmVwZXJjdXNzaW9uc1xuICovXG5cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKTtcblxuLy8gQXJyYXkgb2YgaWRzXG52YXIgU1RVREVOVF9GQU5DWV9OQU1FUyA9IFtcbiAgICBcIk1hbWEgQmVhclwiLCBcIlBhcGEgQmVhclwiLCBcIklyb24gUGFjbWFuXCIsIFwiUGhpbmVhcyBCZXJmXCIsIFwiU3R1YXJ0IE1pbmlvblwiLFxuICAgIFwiRmxhc2ggQ29yZG9uXCIsIFwiQ2hlZiBTYXlyYW1cIiwgXCJNYXJjdXMgTGVtb25cIiwgXCJMaW9uIE1lc3N5XCIsIFwiRWxzYSBGcm96aW5cIixcbiAgICBcIkNsb3duIEJvem9cIiwgXCJSYWJiaSBKYWNvYlwiXG5dO1xuXG4vKipcbiAqXG4gKi9cbmZ1bmN0aW9uIGluaXRVc2VyTmFtZSgpXG57XG4gICAgbG9hZFN0dWRlbnROYW1lKCk7XG5cbiAgICAvLyBMaXN0ZW5lcnNcbiAgICAkKFwiI3N0dWRlbnRfbmFtZVwiKS5vbihcImNoYW5nZVwiLCBzYXZlU3R1ZGVudE5hbWUgKTsgICAgICAgICAgICAgICAgICAgICAgLy8gZnVuY3Rpb24oKSB7IHB1c2hUb1NwaGVyb09uQ2xpY2soIGJyb3dzZXJXZWJTb2NrZXQpOyB9KTtcblxuICAgIHJldHVybjtcbn1cblxuXG5mdW5jdGlvbiBsb2FkU3R1ZGVudE5hbWUoKVxue1xuICAgIHZhciBuYW0gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInN0dWRlbnROYW1lXCIpO1xuICAgIGlmICghbmFtKSB7XG4gICAgICAgIG5hbSA9IFNUVURFTlRfRkFOQ1lfTkFNRVNbIE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiBTVFVERU5UX0ZBTkNZX05BTUVTLmxlbmd0aCApIF07XG4gICAgfVxuICAgICQoXCIjc3R1ZGVudF9uYW1lXCIpLnZhbCggbmFtICk7XG59XG5cbmZ1bmN0aW9uIHNhdmVTdHVkZW50TmFtZSgpXG57XG4gICAgdmFyIG5hbSA9ICQoXCIjc3R1ZGVudF9uYW1lXCIpLnZhbCgpO1xuICAgIGlmIChuYW0pIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oIFwic3R1ZGVudE5hbWVcIiwgbmFtICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oIFwic3R1ZGVudE5hbWVcIiApO1xuICAgIH1cbn1cblxuXG5cbmV4cG9ydHMuaW5pdFVzZXJOYW1lID0gaW5pdFVzZXJOYW1lO1xuIl19
