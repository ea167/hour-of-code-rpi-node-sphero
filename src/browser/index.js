'use strict';

// Global WebSocket from the browser to the RPi, which handles bi-dir communications. Defined in the webpage.
// var browserWebSocket = null;

var $ = require('jquery');

// ===== Modules Required =====
var initBrowserSocket   = require('./socket').initBrowserSocket;
var initEditor          = require('./js-editor').initEditor;
var initExamplesButtons = require('./example-buttons').initExamplesButtons;
var initUserName        = require('./user-name').initUserName;
var initSelectSphero    = require('./select-sphero').initSelectSphero;


// ----- Shortcut Utils
var globalCommObject    = $({});
$.subscribe             = globalCommObject.on.bind(globalCommObject);
$.unsubscribe           = globalCommObject.off.bind(globalCommObject);
$.publish               = globalCommObject.trigger.bind(globalCommObject);


// ===== Start of the main page =====
$(document).ready( function() {

    // --- Init the Sphero dropdown as soon as the ws connection is established
    $.subscribe('init_sphero_dropdown', initSelectSphero);
    console.log("document ready init_sphero_dropdown subscribe");

    // --- Start the WebSocket between the browser and the RPi
    browserWebSocket = initBrowserSocket();

    // --- Init the JS editor
    initEditor();
    //
    initExamplesButtons();
    //
    initUserName();
    return;
});


// Save models to localstorage
// localStorage.setItem('toto', JSON.stringify("toto"));

//$.subscribe('resetscreen', function() {
//  $('#result').text('');
//  $('.error-row').hide();
//});
