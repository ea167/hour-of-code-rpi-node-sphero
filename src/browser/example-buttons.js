/**
 *  Handle the clicks on the example buttons and the loading of the code in the JS editor
 */
var $ = require('jquery');

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
