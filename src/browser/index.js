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


// ----- Shortcut Utils: In-Browser Communication
$.IBC                   = $({});
// To subscribe         = $.IBC.on;
// To unsubscribe       = $.IBC.off;
// To publish           = $.IBC.trigger; 


// ===== Start of the main page =====
$(document).ready( function() {

    // --- Init the Sphero dropdown as soon as the ws connection is established
    $.IBC.on('init_sphero_dropdown', initSelectSphero);

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
