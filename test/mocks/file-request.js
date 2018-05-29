'use strict';

var fs = require('fs'),
  concat = require('concat-stream');

/**
 * @constructor FileRequest
 *  @param {Object} opts - Options for configuring FileRequest
 * A basic mock which mimics an IncomingHttpRequest
 * but pipes data a from a file.
 */
var FileRequest = module.exports = function FileRequest(opts) {
  this.headers = opts.headers || {};
  this.file = opts.file;
  this.params = opts.params;
  this.url = opts.url;
  this.buffer = opts.buffer !== false;
};

/**
 * @function pipe
 *  @param {Stream} dest - Destination stream
 * When we are piped to a destination pipe the contents
 * of the file we were created with
 * @returns {Stream} dest stream
 */
FileRequest.prototype.pipe = function (dest) {
  var readable = fs.createReadStream(this.file);

  readable.pipe(this.concat());
  readable.pipe(dest);

  return dest;
};

/**
 * Returns a new concat stream which stores the data
 * on this instance for future use.
 * @returns {Stream} concat-stream instance
 */
FileRequest.prototype.concat = function () {
  var self = this;
  return concat({ encoding: 'string' }, function (data) {
    self.content = data;
  });
};
