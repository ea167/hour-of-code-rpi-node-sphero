'use strict';

const util          = require('util');
const EventEmitter  = require('events');


/**
*  EventEmitter class for all Sphero and log events
*/
function SpheroEvents()
{
    // Derive from EventEmitter so some other code can listen to when token is available
    EventEmitter.call(this);
}
// Inherit functions from EventEmitter's prototype
util.inherits(SpheroEvents, EventEmitter);


global.spheroEvents = global.spheroEvents || new SpheroEvents();

module.exports = SpheroEvents;
