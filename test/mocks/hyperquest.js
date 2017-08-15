'use strict';

var stream = require('stream'),
  util = require('util');

/**
 * A proper, simple mock for the request module when
 * using `proxyquire`.
 *
 * @param {Object} context Options for constructing our mock hyperquest creator.
 *   @param {string} response Response body to send back.
 *   @param {function} created Continuation to give new instances to.
 * @returns {function} A factory for NaiveRequest
 */
module.exports = function (context) {
  return function request(uri, opts) {
    var req = new NaiveRequest(uri, opts, context.response);
    if (context.created) {
      context.created(req);
    }

    return req;
  };
};

/**
 * @constructor NaiveRequest
 *  @param {String} uri The URI we are requesting
 *  @param {Object} opts Configuration for request
 *  @param {Object} expected Expectation object for assessing request
 * VERY VERY naive request mock. Basically just a pass-through
 * Transform stream that stores all opts.
 */
function NaiveRequest(uri, opts, expected) {
  stream.Transform.call(this);

  this.uri = uri;
  this.method = opts.method;
  this.headers = opts.headers;
  this.agent = opts.agent;
  this.expected = expected || {};
  this.content = '';
}

util.inherits(NaiveRequest, stream.Transform);

/**
 * @function _transform
 *  @param {Buffer|String} chunk Chunk of the request
 *  @param {String} enc Encoding of the stream
 *  @param {function} callback Continuation after chunk is handled
 * Write all data to a separate internal buffer for future assertion
 * and push our response onto the streams buffer once if this
 * instance has a response.
 * @returns {undefined}
 */
NaiveRequest.prototype._transform = function (chunk, enc, callback) {
  if (!this.content) {
    //
    // Mock our "response", which is simply the value
    // of any "expected" response we were configured with
    // along with the instance for simulating errors, etc.
    //
    this.emit('response', this.expected, this);
    if (this.expected.body) {
      this.push(this.expected.body);
    }
  }

  this.content += chunk;
  callback();
};
