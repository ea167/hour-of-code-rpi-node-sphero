/**
 *  UI on User Name + its repercussions
 */
var $ = require('jquery');
var escape = require('./html-escape');

/**
 *  mySpherosMap is defined globally
 */
function fillDataStreamingTable(  )
{
    console.log( "DEBUG in data-streaming.fillDataStreamingTable. Emptying table" );
    console.log(mySpherosMap);

    $("#data_stream_thead_tr_id th").remove();
    $("#data_stream_tbody_id    td").remove();

    // Is there any Sphero at all?
    if ( !mySpherosMap || !Object.keys(mySpherosMap) ) {
        console.log( "DEBUG in data-streaming.fillDataStreamingTable: mySpherosMap empty" );
        return;
    }

    // --- Now fills the table
    for (var macaddr in mySpherosMap) {
        var mySphero = mySpherosMap[macaddr];
        // Header
        $("#data_stream_thead_tr_id").append("<th>"+ escape(mySphero.name) +"</th>");
        // Data
        $("#data_stream_posx").append("<td>"+ escape(mySphero.posX) +"</td>");
        $("#data_stream_posy").append("<td>"+ escape(mySphero.posY) +"</td>");
        $("#data_stream_speedx").append("<td>"+ escape(mySphero.speedX) +"</td>");
        $("#data_stream_speedy").append("<td>"+ escape(mySphero.speedY) +"</td>");
        $("#data_stream_accelx").append("<td>"+ escape(mySphero.accelX) +"</td>");
        $("#data_stream_accely").append("<td>"+ escape(mySphero.accelY) +"</td>");
        $("#data_stream_accelone").append("<td>"+ escape(mySphero.accelOne) +"</td>");
        $("#data_stream_timestamp").append("<td>"+ escape(mySphero.timestamp) +"</td>");
    }
    return;
}

exports.fillDataStreamingTable = fillDataStreamingTable;
