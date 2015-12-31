/**
 *  Manages the JS editor (CodeMirror in this project)
 */
var $ = require('jquery');

var CodeMirror = require('codemirror/lib/codemirror');

require('codemirror/mode/javascript/javascript');
//require('codemirror/mode/css/css');
//require('codemirror/mode/htmlmixed/htmlmixed');

// ----- Addons: see https://codemirror.net/doc/manual.html#addons -----
//
// WARNING: .css files in addon directory MUST BE COPIED in public/lib/codemirror
//          and INCLUDED MANUALLY IN THE HTML PAGE !!
//
// The simplest is to copy ALL .css from addon directories into public/lib/codemirror:
//
//     cp `ls  node_modules/codemirror/addon/*/*.css` public/lib/codemirror/
//

// Search-replace
require('codemirror/addon/dialog/dialog');
require('codemirror/addon/search/searchcursor');
require('codemirror/addon/search/search');
// Adds a highlightSelectionMatches option that can be enabled to highlight all instances of a currently selected word
require('codemirror/addon/search/match-highlighter');

// Defines an option matchBrackets which, when set to true, causes matching brackets to be highlighted whenever the cursor is next to them
require('codemirror/addon/edit/matchbrackets');

// Defines a styleActiveLine option that, when enabled, gives the wrapper of the active line the class CodeMirror-activeline, and adds a background with the class CodeMirror-activeline-background.
require('codemirror/addon/selection/active-line');

// Full screen: F11 does not work on Mac
require('codemirror/addon/display/fullscreen');

// Defines an interface component for showing linting warnings, with pluggable warning sources
require('codemirror/addon/lint/lint');
require('codemirror/addon/lint/javascript-lint');

// Provides a framework for showing autocompletion hints. Defines editor.showHint, which takes an optional options object, and pops up a widget that allows the user to select a completion
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/javascript-hint');
// TODO: Define additional hints for Sphero



// --- To avoid double-clicks
var lastClickOnPushToSphero     = null;
var lastClickOnStopSphero       = null;
// To avoid duplicate saves
var lastContentSaveEditorGeneration = null;



function initEditor()
{
    // var codeMirrorEditor globally defined
    codeMirrorEditor = CodeMirror( document.getElementById("code_mirror_id"), {
        value: "// Type your code here",
        lineNumbers: true,
        indentUnit: 4,
        viewportMargin: Infinity,
        mode:  "javascript",
        // Addons
        highlightSelectionMatches: true,
        matchBrackets: true,
        styleActiveLine: true,
        extraKeys: { 'Ctrl-Space': 'autocomplete' },
        gutters: ['CodeMirror-lint-markers'],
        hint: true,             // CodeMirror.hint.javascript,
        lint: true              // CodeMirror.lint.javascript,
    });


    // --- Save on unload
    $(window).on("unload", saveCurrentEditorCodeToLocalStorage );

    // --- Onload, charge the previous code, or default.js
    loadEditorFirstCode();

    // Interval to record code history, when there are changes, in local storage,
    //  every minute at most, keep the last 50 max of codes posted (they should be stored on RPi)
    setInterval( saveCodeEveryMinuteToLocalStorage, 60000 );

    // --- Init the behaviour of buttons for the JS editor
    initEditorButtons();

    return;
}



function initEditorButtons()
{
    // Listeners
    $("#push_to_sphero").on("click", pushToSpheroOnClick );        // function() { pushToSpheroOnClick( browserWebSocket); });
    $("#stop_sphero").on("click",    stopSpheroOnClick );
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
    //
    var studentName = $("#student_name").val();

    // Send the code!
    browserWebSocket.send( JSON.stringify( {
        "action": "push-code",
        "spheroIsDark": (!myIndex || myIndex == 0),
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
    browserWebSocket.send( JSON.stringify( { "action":"stop-code", "studentName": studentName, "spheroIsDark": (!myIndex || myIndex == 0) } ));   // browserWebSocket global var
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



exports.initEditor = initEditor;
exports.saveCurrentEditorCodeToLocalStorage = saveCurrentEditorCodeToLocalStorage;
