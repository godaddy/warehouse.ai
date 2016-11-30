'use strict';

var EventEmitter = require('events').EventEmitter,
    util = require('util');

/**
 * @function fork
 *  @param {String} script - Script to execute
 *  @param {Object} opts - Other configuration
 * A proper, simple mock for the gjallarhorn module when
 * using `proxyquire`.
 * @returns {ChildProc} instance of ChildProc
 */
exports.fork = function fork(script, opts) {
  return new ChildProc(script, opts);
};

/**
 * @constructor ChildProc
 *  @param {String} script - Fake script to execute
 *  @param {Object} opts - Opts for fake child
 * A proper, simple mock for a child process when
 * using `proxyquire`.
 */
function ChildProc(script, opts) {
  EventEmitter.call(this);
  this.script = script;
  this.options = opts;
  this.received = [];
}

util.inherits(ChildProc, EventEmitter);

/**
 * @function send
 *  @param {Object} data - Payload to send to child
 * Mock for `child_process.send`. Appends the data received for later use.
 * @returns {undefined}
 */
ChildProc.prototype.send = function (data) {
  this.received.push(data);
  this.__script = data.check.split('/').pop();
  setImmediate(this.emit.bind(this), 'exit', 0, null);
};
