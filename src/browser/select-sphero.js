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
     // Load localStorage into global currentMacAddress if exists
    loadSpheroChoice();

    // Update dropdown when activeSpherosMap info is available
    $.IBC.on( 'activeSpherosMap', function(data) {
        console.log("DEBUG: update of activeSpherosMap => update of the Sphero dropdown, currentMacAddress=[%s]", currentMacAddress);
        fillSpheroDropdown();
    });

    // Make sure activeSpherosMap gets initialized when browser connects
    $.IBC.trigger('get-spheros');
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
    // Try to select the currentMacAddress
    displayDropDownChoice( currentMacAddress );

    // --- If effective, then we have to tell RPi the currentUser has attached to that Sphero!
    var dataMacAddr = $("#sphero_name_id").attr("data-macaddr");
    if ( dataMacAddr && activeSpherosMap[ dataMacAddr ].user != currentUser ) {
        $.IBC.trigger('sphero-selected', JSON.stringify( { "macAddress":currentMacAddress, "user":currentUser } ) );
    }


    // ----- On selection: replace the main value if valid + call RPi to update activeSpherosMap!
    $("#sphero_name_ul li a").on('click', function(evt) {
        var macAddress = $(evt.target).parent().attr("data-macaddr");
        console.log("DEBUG: click on Sphero dropdown with macaddr=[%s]", macAddress);
        if (!macAddress) {
            console.log("DEBUG in select-sphero.fillSpheroDropdown: data-macaddr attribute null => dropdown reset!");
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
        // Set the user as the current one
        as.user = currentUser;

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
    displayDropDownChoice( macAddress );

    // ---  Link this activeSphero to this User (currentUser)
    if ( (!macAddress && !currentMacAddress) || currentMacAddress == macAddress ) {
        // No changes, nothing to Signal
        console.log("DEBUG in select-sphero.newSpheroSelected: NO CHANGES in macAddress=[%s]", macAddress);
        return;
    }

    // At that point, the selection has changed, we want to update the RPi-color
    var isReset = !macAddress || !activeSphero;
    $.IBC.trigger('sphero-selected', JSON.stringify( isReset
        ? { "macAddress":currentMacAddress, "user":"" }
        : activeSphero ) );

    saveSpheroChoice( isReset ? null : macAddress );
    return;
}



/** \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ */
function displayDropDownChoice( macAddress )
{
    var isReset      = !macAddress;
    var activeSphero = isReset ? null : activeSpherosMap[ macAddress ];
    if (!activeSphero) {            // May be disconnected by now!
        isReset = true;
    }

    $("#sphero_name_id").attr( "data-macaddr", isReset ? "" : macAddress );
    $("#sphero_name_txt").html( isReset ? "Select..." : escape(activeSphero.name) );
    // console.log( activeSphero.cssColor );
    $("#sphero_name_btn").css("background-color",   isReset ? "" : activeSphero.cssColor );
    $("#sphero_name_btn").css("color",              isReset ? "black" : "white");
    return;
}


function loadSpheroChoice()
{
    if (!currentMacAddress) {
        currentMacAddress = localStorage.getItem("spheroMacAddress");
    }
}


function saveSpheroChoice( macAddress )
{
    currentMacAddress =  macAddress;               // isReset ? null : macAddress;
    if (macAddress) {
        localStorage.setItem( "spheroMacAddress", macAddress );
    } else {
        localStorage.removeItem( "spheroMacAddress" );
    }
}


exports.initSelectSphero = initSelectSphero;
