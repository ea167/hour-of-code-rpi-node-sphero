/**
 *  Handle the clicks on the example buttons and the loading of the code in the JS editor
 */
var $ = require('jquery');

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
        $("#"+exampleId).on("click", function() { showExampleArea(exampleId); });
    }

    // --- Bind the hide / edit code buttons

    // TODO

    return;
}


// --- Download all examples locally through ajax
function downloadExampleCode( exampleId )
{

}

// --- Show the code in the example area,
function showExampleArea( exampleId )
{
    currentExampleCodeIdDisplayed = exampleId;

    // Set div content + show div

}

// TODO: Bind on the buttons to display the examples and copy the code to the editor

// TODO: Button to copy code to the editor

exports.initExamplesButtons = initExamplesButtons;
