/**
 *  Manages the JS editor (CodeMirror in this project)
 */
var $ = require('jquery');

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
    //
    var studentName = $("#student_name").val();

    // Send the code!
    browserWebSocket.send( JSON.stringify( {
        "action": "push-code",
        "spheroIsDark": (!myIndex),
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
    browserWebSocket.send( JSON.stringify( { "action":"stop-code", "studentName": studentName, "spheroIsDark": (!myIndex) } ));   // browserWebSocket global var
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
