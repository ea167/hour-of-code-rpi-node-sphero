(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

// Global WebSocket from the browser to the RPi, which handles bi-dir communications. Defined in the webpage.
// var browserWebSocket = null;

// ===== Modules Required =====
var initBrowserSocket = require('./socket').initBrowserSocket;
var initEditorButtons = require('./js-editor').initEditorButtons;


// ===== Start of the main page =====
$(document).ready(function()
{
    // --- Initialize all the views
    // initViews();

    // --- Start the WebSocket between the browser and the RPi
    browserWebSocket = initBrowserSocket();

    // --- Init the behaviour of buttons for the JS editor
    initEditorButtons();


    // FIXME !!!
    // Save models to localstorage
    //localStorage.setItem('toto', JSON.stringify("toto"));

    //$.subscribe('resetscreen', function() {
    //  $('#result').text('');
    //  $('.error-row').hide();
    //});

});

},{"./js-editor":2,"./socket":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9qcy1lZGl0b3IuanMiLCJzcmMvYnJvd3Nlci9zb2NrZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8vIEdsb2JhbCBXZWJTb2NrZXQgZnJvbSB0aGUgYnJvd3NlciB0byB0aGUgUlBpLCB3aGljaCBoYW5kbGVzIGJpLWRpciBjb21tdW5pY2F0aW9ucy4gRGVmaW5lZCBpbiB0aGUgd2VicGFnZS5cbi8vIHZhciBicm93c2VyV2ViU29ja2V0ID0gbnVsbDtcblxuLy8gPT09PT0gTW9kdWxlcyBSZXF1aXJlZCA9PT09PVxudmFyIGluaXRCcm93c2VyU29ja2V0ID0gcmVxdWlyZSgnLi9zb2NrZXQnKS5pbml0QnJvd3NlclNvY2tldDtcbnZhciBpbml0RWRpdG9yQnV0dG9ucyA9IHJlcXVpcmUoJy4vanMtZWRpdG9yJykuaW5pdEVkaXRvckJ1dHRvbnM7XG5cblxuLy8gPT09PT0gU3RhcnQgb2YgdGhlIG1haW4gcGFnZSA9PT09PVxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKVxue1xuICAgIC8vIC0tLSBJbml0aWFsaXplIGFsbCB0aGUgdmlld3NcbiAgICAvLyBpbml0Vmlld3MoKTtcblxuICAgIC8vIC0tLSBTdGFydCB0aGUgV2ViU29ja2V0IGJldHdlZW4gdGhlIGJyb3dzZXIgYW5kIHRoZSBSUGlcbiAgICBicm93c2VyV2ViU29ja2V0ID0gaW5pdEJyb3dzZXJTb2NrZXQoKTtcblxuICAgIC8vIC0tLSBJbml0IHRoZSBiZWhhdmlvdXIgb2YgYnV0dG9ucyBmb3IgdGhlIEpTIGVkaXRvclxuICAgIGluaXRFZGl0b3JCdXR0b25zKCk7XG5cblxuICAgIC8vIEZJWE1FICEhIVxuICAgIC8vIFNhdmUgbW9kZWxzIHRvIGxvY2Fsc3RvcmFnZVxuICAgIC8vbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3RvdG8nLCBKU09OLnN0cmluZ2lmeShcInRvdG9cIikpO1xuXG4gICAgLy8kLnN1YnNjcmliZSgncmVzZXRzY3JlZW4nLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgJCgnI3Jlc3VsdCcpLnRleHQoJycpO1xuICAgIC8vICAkKCcuZXJyb3Itcm93JykuaGlkZSgpO1xuICAgIC8vfSk7XG5cbn0pO1xuIiwiLyoqXG4gKiAgTWFuYWdlcyB0aGUgSlMgZWRpdG9yIChDb2RlTWlycm9yIGluIHRoaXMgcHJvamVjdClcbiAqL1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpO1xuXG4vLyBUbyBhdm9pZCBkb3VibGUtY2xpY2tzXG52YXIgbGFzdENsaWNrT25QdXNoVG9TcGhlcm8gICAgID0gbnVsbDtcbnZhciBsYXN0Q2xpY2tPblN0b3BTcGhlcm8gICAgICAgPSBudWxsO1xuLy8gVG8gYXZvaWQgZHVwbGljYXRlIHNhdmVzXG52YXIgbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiA9IG51bGw7XG5cblxuZnVuY3Rpb24gaW5pdEVkaXRvckJ1dHRvbnMoKVxue1xuICAgIC8vIExpc3RlbmVyc1xuICAgICQoXCIjcHVzaF90b19zcGhlcm9cIikub24oXCJjbGlja1wiLCBwdXNoVG9TcGhlcm9PbkNsaWNrICk7ICAgICAgICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uKCkgeyBwdXNoVG9TcGhlcm9PbkNsaWNrKCBicm93c2VyV2ViU29ja2V0KTsgfSk7XG4gICAgJChcIiNzdG9wX3NwaGVyb1wiKS5vbihcImNsaWNrXCIsICAgIHN0b3BTcGhlcm9PbkNsaWNrICk7XG5cbiAgICAvLyBJbnRlcnZhbCB0byByZWNvcmQgY29kZSBoaXN0b3J5LCB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzLCBpbiBsb2NhbCBzdG9yYWdlLFxuICAgIC8vICBldmVyeSBtaW51dGUgYXQgbW9zdCwga2VlcCB0aGUgbGFzdCA1MCBtYXggb2YgY29kZXMgcG9zdGVkICh0aGV5IHNob3VsZCBiZSBzdG9yZWQgb24gUlBpKVxuICAgIHNldEludGVydmFsKCBzYXZlQ29kZUV2ZXJ5TWludXRlVG9Mb2NhbFN0b3JhZ2UsIDYwMDAwICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gcHVzaFRvU3BoZXJvT25DbGljaygpXG57XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgaWYgKCBsYXN0Q2xpY2tPblB1c2hUb1NwaGVybyAmJiAobm93IC0gbGFzdENsaWNrT25QdXNoVG9TcGhlcm8pIDwgNTAwMCApIHtcbiAgICAgICAgY29uc29sZS5sb2coIFwicHVzaFRvU3BoZXJvT25DbGljayBjbGlja2VkIHR3aWNlIHdpdGhpbiA1IHNlY29uZHMuIElnbm9yaW5nIVwiICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdENsaWNrT25QdXNoVG9TcGhlcm8gPSBub3c7XG5cbiAgICAvLyAtLS0gVHJhbnNmZXIgdGhlIENPREUgdG8gUlBpXG4gICAgdmFyIHVzZXJDb2RlID0gY29kZU1pcnJvckVkaXRvci5nZXRWYWx1ZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb2RlTWlycm9yRWRpdG9yIGdsb2JhbCB2YXJcbiAgICAvL1xuICAgIC8vICBGSVhNRTogc3BoZXJvSW5kZXggISEhISBGSVhNRSAhISEhXG4gICAgdmFyIG15SW5kZXggPSAwO1xuICAgIC8vXG4gICAgYnJvd3NlcldlYlNvY2tldC5zZW5kKCBKU09OLnN0cmluZ2lmeSggeyBcImFjdGlvblwiOiBcInB1c2gtY29kZVwiLCBcInNwaGVyb0luZGV4XCI6IG15SW5kZXggLCBcInVzZXJDb2RlXCI6IHVzZXJDb2RlIH0gKSk7ICAvLyBicm93c2VyV2ViU29ja2V0IGdsb2JhbCB2YXJcblxuICAgIC8vIC0tLSBTYXZlIHVzZXJDb2RlIHRvIGxvY2FsU3RvcmFnZVxuICAgIHNhdmVDb2RlVG9Mb2NhbFN0b3JhZ2UoIHVzZXJDb2RlICk7XG4gICAgcmV0dXJuO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gc3RvcFNwaGVyb09uQ2xpY2soKVxue1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIGlmICggbGFzdENsaWNrT25TdG9wU3BoZXJvICYmIChub3cgLSBsYXN0Q2xpY2tPblN0b3BTcGhlcm8pIDwgNTAwMCApIHtcbiAgICAgICAgY29uc29sZS5sb2coIFwicHVzaFRvU3BoZXJvT25DbGljayBjbGlja2VkIHR3aWNlIHdpdGhpbiA1IHNlY29uZHMuIElnbm9yaW5nIVwiICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGFzdENsaWNrT25TdG9wU3BoZXJvID0gbm93O1xuXG4gICAgLy8gIEZJWE1FOiBzcGhlcm9JbmRleCAhISEhIEZJWE1FICEhISFcbiAgICB2YXIgbXlJbmRleCA9IDA7XG4gICAgLy9cblxuICAgIC8vIC0tLSBUcmFuc2ZlciB0aGUgU1RPUCBjb21tYW5kIHRvIFJQaVxuICAgIGJyb3dzZXJXZWJTb2NrZXQuc2VuZCggSlNPTi5zdHJpbmdpZnkoIHsgXCJhY3Rpb25cIjpcInN0b3AtY29kZVwiLCBcInNwaGVyb0luZGV4XCI6IG15SW5kZXggfSApKTsgICAgICAgICAvLyBicm93c2VyV2ViU29ja2V0IGdsb2JhbCB2YXJcbiAgICByZXR1cm47XG59XG5cblxuLyoqXG4gKlxuICovXG5mdW5jdGlvbiBzYXZlQ29kZUV2ZXJ5TWludXRlVG9Mb2NhbFN0b3JhZ2UoKVxue1xuICAgIGlmICggbGFzdENvbnRlbnRTYXZlRWRpdG9yR2VuZXJhdGlvbiAmJiBjb2RlTWlycm9yRWRpdG9yLmlzQ2xlYW4oIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gKSApIHtcbiAgICAgICAgLy8gTm8gbmVlZCB0byBzYXZlLCBubyBjaGFuZ2VzXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gT3R3IHNhdmUgdG8gbG9jYWxTdG9yYWdlXG4gICAgdmFyIHVzZXJDb2RlID0gY29kZU1pcnJvckVkaXRvci5nZXRWYWx1ZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb2RlTWlycm9yRWRpdG9yIGdsb2JhbCB2YXJcbiAgICBzYXZlQ29kZVRvTG9jYWxTdG9yYWdlKCB1c2VyQ29kZSApO1xufVxuXG5cbi8qKlxuICpcbiAqL1xuZnVuY3Rpb24gc2F2ZUNvZGVUb0xvY2FsU3RvcmFnZSggdXNlckNvZGUgKVxue1xuICAgIHZhciBpdGVtTmFtZSA9IFwiY29kZS1cIiArIERhdGUubm93KCk7XG4gICAgLy8gLS0tIFNhdmUgdXNlckNvZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oIGl0ZW1OYW1lLCBKU09OLnN0cmluZ2lmeSh1c2VyQ29kZSkgKTtcbiAgICB2YXIgY29kZUxpc3QgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvZGVMaXN0XCIpO1xuICAgIGNvZGVMaXN0ID0gKCBjb2RlTGlzdCApID8gSlNPTi5wYXJzZSggY29kZUxpc3QgKSA6IFtdO1xuICAgIGNvZGVMaXN0LnB1c2goIGl0ZW1OYW1lICk7XG4gICAgaWYgKGNvZGVMaXN0Lmxlbmd0aCA+IDUwKSB7ICAgICAgICAgICAgIC8vIFByZXZlbnQgaXQgZnJvbSBnZXR0aW5nIHRvbyBiaWchXG4gICAgICAgIHZhciBmaXJzdEl0ZW1OYW1lID0gY29kZUxpc3Quc2hpZnQoKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oIGZpcnN0SXRlbU5hbWUgKTtcbiAgICB9XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oIFwiY29kZUxpc3RcIiwgSlNPTi5zdHJpbmdpZnkoY29kZUxpc3QpICk7XG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgc2F2ZVxuICAgIGxhc3RDb250ZW50U2F2ZUVkaXRvckdlbmVyYXRpb24gPSBjb2RlTWlycm9yRWRpdG9yLmNoYW5nZUdlbmVyYXRpb24oKTtcbiAgICByZXR1cm47XG59XG5cblxuZXhwb3J0cy5pbml0RWRpdG9yQnV0dG9ucyA9IGluaXRFZGl0b3JCdXR0b25zO1xuIiwiLyoqXG4gKiAgSGFuZGxlIFdlYlNvY2tldCBjb25uZWN0aW9uIGZyb20gYnJvd3NlciB0byBSYXNwYmVycnkgUGlcbiAqL1xuLy92YXIgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5mdW5jdGlvbiBpbml0QnJvd3NlclNvY2tldCgpXG57XG4gICB2YXIgc29ja2V0O1xuICAgdmFyIGxvYyA9IHdpbmRvdy5sb2NhdGlvbjtcbiAgIHZhciB1cmwgPSAnd3M6Ly8nKyBsb2MuaG9zdG5hbWUrKGxvYy5wb3J0ID8gJzonK2xvYy5wb3J0OiAnJykgKycvd3MvdXNlcmNvZGluZy8nKyAobG9jLnNlYXJjaCA/IGxvYy5zZWFyY2ggOiAnJyk7IC8vIEZvcndhcmQgdXJsIHBhcmFtZXRlcnNcbiAgIGNvbnNvbGUubG9nKCdTb2NrZXQgVVJMID0gJywgdXJsKTtcblxuICAgLy8gLS0tIHV0aWxzXG4gICB2YXIgbyAgICAgICAgID0gJCh7fSk7XG4gICAkLnN1YnNjcmliZSAgID0gby5vbi5iaW5kKG8pO1xuICAgJC51bnN1YnNjcmliZSA9IG8ub2ZmLmJpbmQobyk7XG4gICAkLnB1Ymxpc2ggICAgID0gby50cmlnZ2VyLmJpbmQobyk7XG5cblxuICAgLy8gLS0tIE9wZW4gc29ja2V0XG4gICB0cnkge1xuICAgICAgIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcbiAgIH0gY2F0Y2goZXhjKSB7XG4gICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBXUyBjb25uZWN0aW9uIGVycm9yOiAnLCBleGMpO1xuICAgfVxuXG4gICBzb2NrZXQub25vcGVuID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgJC5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgIH0pO1xuICAgICAgIC8vLyBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XG4gICB9O1xuXG5cbiAgICAgLy8gLS0tLS0tLSBIZXJlIHdlIGdldCB0aGUgaW5mbyFcbiAgICAgc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgdmFyIGRhdGFPYmogPSBKU09OLnBhcnNlKCBldnQuZGF0YSApO1xuICAgICAgICAgaWYgKGRhdGFPYmouZXJyb3IpIHtcbiAgICAgICAgICAgICAvLy8gc2hvd0Vycm9yKG1zZy5lcnJvcik7XG4gICAgICAgICAgICAgJC5wdWJsaXNoKCdzb2NrZXRzdG9wJyk7XG4gICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgfVxuICAgICAgICAgLy8gLS0tIFRoaXMgaXMgdGhlIG5ldyBiZXN0IHdvcmRzIGFycmF5XG4gICAgICAgICAvLyBGSVhNRVxuICAgICAgICAgdmFyIGpzb25Ccm93c2VyID0gZGF0YU9iajtcbiAgICAgICAgIGlmIChqc29uQnJvd3Nlcikge1xuICAgICAgICAgICAgIGlmIChqc29uQnJvd3Nlci5yZXN1bHRzWzBdLmZpbmFsKSB7XG4gICAgICAgICAgICAgICAgIC8vIGdsb2JhbCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICB1cGRhdGVGaW5hbEJyb3dzZXIoIGpzb25Ccm93c2VyICk7XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgLy8gZ2xvYmFsIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgIHVwZGF0ZUludGVyaW1Ccm93c2VyKCBqc29uQnJvd3NlciApO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgb25tZXNzYWdlIGpzb25Ccm93c2VyIEVNUFRZICcsIGV2dCk7XG4gICAgICAgICB9XG4gICAgICAgICByZXR1cm47XG4gICAgIH07XG5cblxuICAgICAvLyAtLS0gRXJyb3IgJiBDbG9zaW5nXG4gICAgIHNvY2tldC5vbmVycm9yID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9uZXJyb3IgU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAvLy8gc2hvd0Vycm9yKCdBcHBsaWNhdGlvbiBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgLy8gVE9ETyA/PyBDbG9zZSA/PyAvLyAkLnB1Ymxpc2goJ3NvY2tldHN0b3AnKTtcbiAgICAgfTtcblxuICAgICBzb2NrZXQub25jbG9zZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgY29uc29sZS5sb2coJ0Jyb3dzZXIgV1Mgb25jbG9zZTogJywgZXZ0KTtcbiAgICAgICAgIGlmIChldnQuY29kZSA+IDEwMDApIHtcbiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9uY2xvc2UgU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAgICAgLy8gc2hvd0Vycm9yKCdTZXJ2ZXIgZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgICAgICAvLyByZXR1cm4gZmFsc2U7XG4gICAgICAgICB9XG4gICAgICAgICAvLyBNYWRlIGl0IHRocm91Z2gsIG5vcm1hbCBjbG9zZVxuICAgICAgICAgJC51bnN1YnNjcmliZSgnc29ja2V0c3RvcCcpO1xuICAgICB9O1xuXG4gICAgIHJldHVybiBzb2NrZXQ7XG59XG5cbmV4cG9ydHMuaW5pdEJyb3dzZXJTb2NrZXQgPSBpbml0QnJvd3NlclNvY2tldDtcbiJdfQ==
