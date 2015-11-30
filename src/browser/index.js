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
