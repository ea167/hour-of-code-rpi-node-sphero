(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

// Global WebSocket from the browser to the RPi, which handles bi-dir communications
var browserWebSocket = null;

// ===== Modules Required =====
var initBrowserSocket = require('./socket').initBrowserSocket;


// ===== Start of the main page =====
$(document).ready(function()
{
    // --- Initialize all the views
    // initViews();

    // --- Start the WebSocket between the browser and the RPi
    browserWebSocket = initBrowserSocket();




    // FIXME !!!
    // Save models to localstorage
    localStorage.setItem('toto', JSON.stringify("toto"));

    $.subscribe('resetscreen', function() {
      $('#result').text('');
      $('.error-row').hide();
    });

});

},{"./socket":2}],2:[function(require,module,exports){
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

module.exports = initBrowserSocket;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Jyb3dzZXIvaW5kZXguanMiLCJzcmMvYnJvd3Nlci9zb2NrZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBHbG9iYWwgV2ViU29ja2V0IGZyb20gdGhlIGJyb3dzZXIgdG8gdGhlIFJQaSwgd2hpY2ggaGFuZGxlcyBiaS1kaXIgY29tbXVuaWNhdGlvbnNcbnZhciBicm93c2VyV2ViU29ja2V0ID0gbnVsbDtcblxuLy8gPT09PT0gTW9kdWxlcyBSZXF1aXJlZCA9PT09PVxudmFyIGluaXRCcm93c2VyU29ja2V0ID0gcmVxdWlyZSgnLi9zb2NrZXQnKS5pbml0QnJvd3NlclNvY2tldDtcblxuXG4vLyA9PT09PSBTdGFydCBvZiB0aGUgbWFpbiBwYWdlID09PT09XG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpXG57XG4gICAgLy8gLS0tIEluaXRpYWxpemUgYWxsIHRoZSB2aWV3c1xuICAgIC8vIGluaXRWaWV3cygpO1xuXG4gICAgLy8gLS0tIFN0YXJ0IHRoZSBXZWJTb2NrZXQgYmV0d2VlbiB0aGUgYnJvd3NlciBhbmQgdGhlIFJQaVxuICAgIGJyb3dzZXJXZWJTb2NrZXQgPSBpbml0QnJvd3NlclNvY2tldCgpO1xuXG5cblxuXG4gICAgLy8gRklYTUUgISEhXG4gICAgLy8gU2F2ZSBtb2RlbHMgdG8gbG9jYWxzdG9yYWdlXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3RvdG8nLCBKU09OLnN0cmluZ2lmeShcInRvdG9cIikpO1xuXG4gICAgJC5zdWJzY3JpYmUoJ3Jlc2V0c2NyZWVuJywgZnVuY3Rpb24oKSB7XG4gICAgICAkKCcjcmVzdWx0JykudGV4dCgnJyk7XG4gICAgICAkKCcuZXJyb3Itcm93JykuaGlkZSgpO1xuICAgIH0pO1xuXG59KTtcbiIsIi8qKlxuICogIEhhbmRsZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBmcm9tIGJyb3dzZXIgdG8gUmFzcGJlcnJ5IFBpXG4gKi9cbi8vdmFyICQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuZnVuY3Rpb24gaW5pdEJyb3dzZXJTb2NrZXQoKVxue1xuICAgdmFyIHNvY2tldDtcbiAgIHZhciBsb2MgPSB3aW5kb3cubG9jYXRpb247XG4gICB2YXIgdXJsID0gJ3dzOi8vJysgbG9jLmhvc3RuYW1lKyhsb2MucG9ydCA/ICc6Jytsb2MucG9ydDogJycpICsnL3dzL3VzZXJjb2RpbmcvJysgKGxvYy5zZWFyY2ggPyBsb2Muc2VhcmNoIDogJycpOyAvLyBGb3J3YXJkIHVybCBwYXJhbWV0ZXJzXG4gICBjb25zb2xlLmxvZygnU29ja2V0IFVSTCA9ICcsIHVybCk7XG5cbiAgIC8vIC0tLSB1dGlsc1xuICAgdmFyIG8gICAgICAgICA9ICQoe30pO1xuICAgJC5zdWJzY3JpYmUgICA9IG8ub24uYmluZChvKTtcbiAgICQudW5zdWJzY3JpYmUgPSBvLm9mZi5iaW5kKG8pO1xuICAgJC5wdWJsaXNoICAgICA9IG8udHJpZ2dlci5iaW5kKG8pO1xuXG5cbiAgIC8vIC0tLSBPcGVuIHNvY2tldFxuICAgdHJ5IHtcbiAgICAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG4gICB9IGNhdGNoKGV4Yykge1xuICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jyb3dzZXIgV1MgY29ubmVjdGlvbiBlcnJvcjogJywgZXhjKTtcbiAgIH1cblxuICAgc29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICQuc3Vic2NyaWJlKCdzb2NrZXRzdG9wJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgICB9KTtcbiAgICAgICAvLy8gc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICAgfTtcblxuXG4gICAgIC8vIC0tLS0tLS0gSGVyZSB3ZSBnZXQgdGhlIGluZm8hXG4gICAgIHNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIHZhciBkYXRhT2JqID0gSlNPTi5wYXJzZSggZXZ0LmRhdGEgKTtcbiAgICAgICAgIGlmIChkYXRhT2JqLmVycm9yKSB7XG4gICAgICAgICAgICAgLy8vIHNob3dFcnJvcihtc2cuZXJyb3IpO1xuICAgICAgICAgICAgICQucHVibGlzaCgnc29ja2V0c3RvcCcpO1xuICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgIH1cbiAgICAgICAgIC8vIC0tLSBUaGlzIGlzIHRoZSBuZXcgYmVzdCB3b3JkcyBhcnJheVxuICAgICAgICAgLy8gRklYTUVcbiAgICAgICAgIHZhciBqc29uQnJvd3NlciA9IGRhdGFPYmo7XG4gICAgICAgICBpZiAoanNvbkJyb3dzZXIpIHtcbiAgICAgICAgICAgICBpZiAoanNvbkJyb3dzZXIucmVzdWx0c1swXS5maW5hbCkge1xuICAgICAgICAgICAgICAgICAvLyBnbG9iYWwgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgdXBkYXRlRmluYWxCcm93c2VyKCBqc29uQnJvd3NlciApO1xuICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIC8vIGdsb2JhbCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICB1cGRhdGVJbnRlcmltQnJvd3NlcigganNvbkJyb3dzZXIgKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdCcm93c2VyIG9ubWVzc2FnZSBqc29uQnJvd3NlciBFTVBUWSAnLCBldnQpO1xuICAgICAgICAgfVxuICAgICAgICAgcmV0dXJuO1xuICAgICB9O1xuXG5cbiAgICAgLy8gLS0tIEVycm9yICYgQ2xvc2luZ1xuICAgICBzb2NrZXQub25lcnJvciA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmVycm9yIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgLy8vIHNob3dFcnJvcignQXBwbGljYXRpb24gZXJyb3IgJyArIGV2dC5jb2RlICsgJzogcGxlYXNlIHJlZnJlc2ggeW91ciBicm93c2VyIGFuZCB0cnkgYWdhaW4nKTtcbiAgICAgICAgIC8vIFRPRE8gPz8gQ2xvc2UgPz8gLy8gJC5wdWJsaXNoKCdzb2NrZXRzdG9wJyk7XG4gICAgIH07XG5cbiAgICAgc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIFdTIG9uY2xvc2U6ICcsIGV2dCk7XG4gICAgICAgICBpZiAoZXZ0LmNvZGUgPiAxMDAwKSB7XG4gICAgICAgICAgICAgY29uc29sZS5lcnJvcignQnJvd3NlciBvbmNsb3NlIFNlcnZlciBlcnJvciAnICsgZXZ0LmNvZGUgKyAnOiBwbGVhc2UgcmVmcmVzaCB5b3VyIGJyb3dzZXIgYW5kIHRyeSBhZ2FpbicpO1xuICAgICAgICAgICAgIC8vIHNob3dFcnJvcignU2VydmVyIGVycm9yICcgKyBldnQuY29kZSArICc6IHBsZWFzZSByZWZyZXNoIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluJyk7XG4gICAgICAgICAgICAgLy8gcmV0dXJuIGZhbHNlO1xuICAgICAgICAgfVxuICAgICAgICAgLy8gTWFkZSBpdCB0aHJvdWdoLCBub3JtYWwgY2xvc2VcbiAgICAgICAgICQudW5zdWJzY3JpYmUoJ3NvY2tldHN0b3AnKTtcbiAgICAgfTtcblxuICAgICByZXR1cm4gc29ja2V0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXRCcm93c2VyU29ja2V0O1xuIl19
