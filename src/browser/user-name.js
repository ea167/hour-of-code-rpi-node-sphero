/**
 *  UI on User Name + its repercussions
 */

var $ = require('jquery');

// Array of ids
var STUDENT_FANCY_NAMES = [
    "Mama Bear", "Papa Bear", "Iron Pacman", "Phineas Berf", "Stuart Minion",
    "Flash Cordon", "Chef Sayram", "Marcus Lemon", "Lion Messy", "Elsa Frozin",
    "Clown Bozo", "Rabbi Jacob", "Beary Suzuki", "Freddy Heron", "Sammy Squirly"
];

/**
 *
 */
function initUserName()
{
    loadStudentName();

    // Listeners
    $("#student_name").on("change", saveStudentName );                      // function() { pushToSpheroOnClick( browserWebSocket); });
    $("#student_name").on("blur",   _checkEmptyStudentName );

    return;
}


function loadStudentName()
{
    var nam = localStorage.getItem("studentName");
    if (!nam) {
        nam = _getRandomStudentName();
        localStorage.setItem( "studentName", nam );
    }
    currentUser = nam;                                      // Global variable defined in main.html
    $("#student_name").val( nam );
}

function _getRandomStudentName()
{
    return STUDENT_FANCY_NAMES[ Math.floor( Math.random() * STUDENT_FANCY_NAMES.length ) ];
}

function _checkEmptyStudentName()
{
    if ( !( $("#student_name").val() ) ) {
        loadStudentName();
    }
}



function saveStudentName()
{
    var nam = $("#student_name").val();
    if (nam) {
        localStorage.setItem( "studentName", nam );
    } else {
        localStorage.removeItem( "studentName" );
    }

    // TODO: transmit to RPi and update dropdown and activeSpherosMap !!!

}



exports.initUserName = initUserName;
