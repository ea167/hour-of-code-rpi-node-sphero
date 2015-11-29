
'use strict';

var socket = require('./socket');


$(document).ready(function() {

    // initViews();

    // FIXME
    // Save models to localstorage
    localStorage.setItem('toto', JSON.stringify(toto));

    $.subscribe('resetscreen', function() {
      $('#result').text('');
      $('.error-row').hide();
    });

});
