/**
 *  UI on User Name + its repercussions
 */
 var $      = require('jquery');
 var escape = require('./html-escape');


/**
 *  HOC_COLOR is globally positioned (in the html page)
 */
function initSelectSphero()
{
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


/**
 *  Fill the Dropdown from activeSpherosMap
 */
function fillSpheroDropdown()
{
    $("#sphero_name_ul li").remove();
    $("#sphero_name_ul").append( '<li data-macaddr="" style="color:black;"><a href="#" style="color:black;">Select...</a></li>' );
    // Loop on activeSpherosMap
    for (var macaddr in activeSpherosMap) {
        var as = activeSpherosMap[ macaddr ];
        var cssColor = isNaN(as.color) ? "'"+ escape(as.color) +"'" : "#"+as.color.toString(16);
        as.cssColor  = cssColor;
        $("#sphero_name_ul").append( '<li data-macaddr="'+ escape(macaddr)
            + '" style="background-color:'+ cssColor +';">'
            + '<a href="#">'
            + escape(as.name)
            + ( as.user ? ' &lt;=&gt; ' + escape(as.user) : '' )
            + '</a></li>' );
    }

    // ----- On selection: replace the main value if valid + call RPi to update activeSpherosMap!
    $("#sphero_name_ul li a").on('click', function(evt) {
        var macAddress = $(evt.target).parent().attr("data-macaddr");
        console.log("DEBUG: click on Sphero dropdown with macaddr=[%s]", macAddress);
        if (!macAddress) {
            console.info("DEBUG in select-sphero.fillSpheroDropdown: data-macaddr attribute null => dropdown reset!");
            newSpheroSelected( null, null );
            return;
        }
        // Is the Sphero still connected?
        var as = activeSpherosMap[ macAddress ];
        if (!as) {
            console.warn("WARN in select-sphero.fillSpheroDropdown: activeSpherosMap of data-macaddr=%s DISCONNECTED!", macAddress);
            // Display error
            $("#alert_danger_content").html( "<strong>The Sphero selected ("+ escape( $(evt.target).html() )
                +") is unfortunately no longer available (disconnected)</strong>" );
            $("#alert_danger_id").show();
            return;
        }
        // Is the Sphero already taken by another user?
        if ( as.user && as.user != currentUser ) {
            console.warn( "WARN in select-sphero.fillSpheroDropdown: activeSpherosMap of data-macaddr=%s ALREADY TAKEN by USER=[%s]!",
                macAddress, as.user );
            // Display error
            $("#alert_danger_content").html( "<strong>The Sphero selected ("+ escape( $(evt.target).html() )
                +") is already taken by "+ escape(as.user) +"</strong>" );
            $("#alert_danger_id").show();
            return;
        }

        // --- We have a new Sphero selected!
        newSpheroSelected( macAddress, as );
        return;
    });
    return;
}


/**
 *  When the user selects an activeSphero
 *  @param macAddress & activeSphero may be null (to reset the dropdown)
 */
function newSpheroSelected( macAddress, activeSphero )
{
    // --- Set the dropdown
    var isReset = !macAddress || !activeSphero;
    $("#sphero_name_id").attr( "data-macaddr", macAddress );
    $("#sphero_name_txt").html( isReset ? "Select..." : escape(activeSphero.name) );
    // console.log( activeSphero.cssColor );
    $("#sphero_name_btn").css("background-color",   isReset ? "" : activeSphero.cssColor );
    $("#sphero_name_btn").css("color",              isReset ? "black" : "white");



    // ---  Link this activeSphero to this User (currentUser)



    return;
}



/** \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ */
function loadSpheroChoice()
{
    var idx = localStorage.getItem("spheroIdx");
    if (!idx) {
        idx = 0;
    }
    /// $("#rpi_sphero").val( idx );
}


/** \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ */
function loadSpheroChoice()
{
    var idx = localStorage.getItem("spheroIdx");
    if (!idx) {
        idx = 0;
    }
    /// $("#rpi_sphero").val( idx );
}

function saveSpheroChoice()
{
    var idx = $("#rpi_sphero").val();
    localStorage.setItem( "spheroIdx", idx );
}


exports.initSelectSphero = initSelectSphero;
