/**
 *  UI on User Name + its repercussions
 */
var $ = require('jquery');


/**
 * HOC_COLOR is globally positioned (in the html page)
 */
function initSelectSphero()
{
    console.log("initSelectSphero");

    // Update dropdown when activeSpherosMap info is available
    $.subscribe( 'activeSpherosMap', function(data) {
        fillSpheroDropdown();
        loadSpheroChoice();
        console.log( activeSpherosMap );
    });

    // Make sure activeSpherosMap gets initialized when browser connects
    $.publish('get-spheros');

    // Listener when Dropdown option is selected
    $("#rpi_sphero").on("change", saveSpheroChoice );       // FIXME
    return;
}


function fillSpheroDropdown()
{
    console.log( "fillSpheroDropdown TODO" );
}





function loadSpheroChoice()
{
    var idx = localStorage.getItem("spheroIdx");
    if (!idx) {
        idx = 0;
    }
    $("#rpi_sphero").val( idx );
}

function saveSpheroChoice()
{
    var idx = $("#rpi_sphero").val();
    localStorage.setItem( "spheroIdx", idx );
}


exports.initSelectSphero = initSelectSphero;


// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/*
function setSelectSpheroColor()
{
    if (HOC_COLOR != "red" && HOC_COLOR != "green" && HOC_COLOR != "blue" && HOC_COLOR != "yellow" && HOC_COLOR != "purple" ) {
        console.error( "HOC_COLOR has wrong value: " + HOC_COLOR );
        return;
    }

    // Set the right color to the select box
    $("#rpi_sphero").removeClass( "red-bg-txt green-bg-txt blue-bg-txt yellow-bg-txt purple-bg-txt" );
    $("#rpi_sphero option").removeClass( "red-bg-txt green-bg-txt blue-bg-txt yellow-bg-txt purple-bg-txt" );
    $("#rpi_sphero").addClass( HOC_COLOR + "-bg-txt" );
    $("#rpi_sphero option").addClass( HOC_COLOR + "-bg-txt" );

    $("#rpi_sphero option[value='0']").text("Sphero Dark "+ HOC_COLOR );
    $("#rpi_sphero option[value='1']").text("Sphero Light "+ HOC_COLOR );
    return;
}
*/
