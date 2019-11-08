'use strict';

var join = require('path').join,
  concat = require('concat-stream'),
  ndjson = require('ndjson'),
  readonly = require('read-only-stream'),
  wrhs = require('warehouse-models');
var { DynamoDB } = require('aws-sdk');
var dynamo = require('dynamodb-x');
var config = require('../config/development.json');

var proxyquire = require('proxyquire').noPreserveCache();

var lib = require('../helpers').dirs.lib;

// Export our "submodules" for future use
//
exports.childProcess = require('./child-process');
exports.FileRequest = require('./file-request');
exports.hyperquest = require('./hyperquest');
exports.registry = require('registry-mock');
exports.models = function () {
  const dynamoDriver = new DynamoDB(config.database);
  dynamo.dynamoDriver(dynamoDriver);

  return wrhs(dynamo);
};

exports.carpenterBuildResponse = function ({ error } = {}) {
  return () => {
    const stream = ndjson.serialize();

    stream.write({
      event: error ? 'error' : 'info',
      id: 'blah',
      message: 'things'
    });

    stream.end();

    return readonly(stream);
  };
};

/**
 * Returns a Publisher with a mocked "child_process"
 * so that we don't fork-bomb the unit tests along with
 * a hyperquest that will always return the `response`.
 *
 * @param {Object} opts Options for the Publisher and mock modules
 * @param {string} opts.response Response object (body, headers, etc) to send back.
 * @param {Object} opts.config Options for the Publisher instance.
 * @param {function} opts.onHttpProxy Continuation receiving outbound http requests.
 * @returns {Publisher} Mocked publisher object
 */
exports.publisher = function (opts) {
  opts = opts || {};
  var Publisher = proxyquire(join(lib, 'npm', 'publisher'), {
    child_process: exports.childProcess,
    hyperquest: exports.hyperquest({
      response: opts.response,
      created: opts.onHttpProxy
    })
  });

  //
  // If no config is supplied then simply return the
  // constructor function for the caller to consume.
  //
  if (!opts.config) {
    return Publisher;
  }

  return new Publisher(opts.config).setup();
};

/**
 * Mocks the carpenter-api-client, which performs requests throught hyperquest
 * against the Carpenter build service.
 *
 * @type {Object}
 */
exports.carpenter = {
  build: function build() {
    return concat();
  }
};

/**
 * Mocks the App object that we use in slay to test preboots expose what they
 * expect
 *
 * @param {Object} options - configurable options for this app
 * @returns {Object} mocked app
 */
exports.App = function App(options) {
  if (this instanceof App !== true) return new App(options);

  this.options = options || {};

  this.config = {};
  this.config.get = key => {
    return this.options[key];
  };

  this.config.set = (key, val) => {
    this.options[key] = val;
  };

  return this;
};
