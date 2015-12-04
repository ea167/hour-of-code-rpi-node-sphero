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
