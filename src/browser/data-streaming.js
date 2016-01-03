/**
 *  UI on User Name + its repercussions
 */
var $ = require('jquery');
var escape = require('./html-escape');

/**
 *  mySpherosDataMap is defined globally
 */
function fillDataStreamingTable()
{
    //console.log( "\nDEBUG in data-streaming.fillDataStreamingTable. Emptying table" );
    //console.log( mySpherosDataMap );

    $("#data_stream_thead_tr_id th").remove();
    $("#data_stream_tbody_id    td").remove();

    // Is there any Sphero at all?
    if ( !mySpherosDataMap || !Object.keys(mySpherosDataMap) ) {
        console.log( "DEBUG in data-streaming.fillDataStreamingTable: mySpherosDataMap empty" );
        return;
    }

    // --- Now fills the table
    for (var macaddr in mySpherosDataMap) {
        var mySpheroData = mySpherosDataMap[macaddr];
        //console.log( "DEBUG in data-streaming.fillDataStreamingTable: %s", mySpheroData.name );
        // Header
        $("#data_stream_thead_tr_id").append("<th>"+ escape(mySpheroData.name) +"</th>");
        // Data
        $("#data_stream_posx").append("<td>"+ escape(mySpheroData.posX) +"</td>");
        $("#data_stream_posy").append("<td>"+ escape(mySpheroData.posY) +"</td>");
        $("#data_stream_speedx").append("<td>"+ escape(mySpheroData.speedX) +"</td>");
        $("#data_stream_speedy").append("<td>"+ escape(mySpheroData.speedY) +"</td>");
        $("#data_stream_accelx").append("<td>"+ escape(mySpheroData.accelX) +"</td>");
        $("#data_stream_accely").append("<td>"+ escape(mySpheroData.accelY) +"</td>");
        $("#data_stream_accelone").append("<td>"+ escape(mySpheroData.accelOne) +"</td>");
        $("#data_stream_timestamp").append("<td>"+ escape(mySpheroData.timestamp) +"</td>");
    }
    return;
}

exports.fillDataStreamingTable = fillDataStreamingTable;
