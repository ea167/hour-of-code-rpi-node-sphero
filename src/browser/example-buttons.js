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


    }

    // --- Listeners  // ADD # !!!!
    $("#beginner1").on("click", pushToSpheroOnClick );                      // function() { pushToSpheroOnClick( browserWebSocket); });
    $("#advanced1").on("click",    stopSpheroOnClick );


    return;
}


// TODO: download all examples locally through ajax


// TODO: Bind on the buttons to display the examples and copy the code to the editor


// TODO: Button to copy code to the editor

exports.initExamplesButtons = initExamplesButtons;
