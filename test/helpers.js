'use strict';

var fs = require('fs'),
  path = require('path'),
  async = require('async'),
  etag = require('etag'),
  extend = require('extend'),
  registry = require('../lib');

/**
 * @property {defaultStart} Object
 * Default start configuration.
 */
var defaultStart = {
  log: { level: 'critical' }
};

//
// Default options to start slay with
//
var defaultAppOpts = {
  http: 8090,
  npm: {
    urls: {
      write: {
        'default': 'http://localhost:8091',
        '@good': 'http://localhost:8091'
      }
    }
  },
  database: {
    config: {
      keyspace: 'warehouse_test',
      user: 'cassandra',
      password: 'cassandra',
      hosts: ['127.0.0.1'],
      keyspaceOptions: {
        class: 'SimpleStrategy',
        replication_factor: 1
      }
    }
  }
};

var defaultRegOpts = {
  http: 8091
};

/**
 * @property {dirs} Object
 * All relevant directories for testing.
 */
exports.dirs = {
  root: path.join(__dirname, '..'),
  lib: path.join(__dirname, '..', 'lib'),
  config: path.join(__dirname, 'config'),
  actualConfig: path.join(__dirname, '..', 'config'),
  unit: path.join(__dirname, 'unit'),
  integration: path.join(__dirname, 'integration'),
  fixtures: path.join(__dirname, 'fixtures'),
  payloads: path.join(__dirname, 'fixtures', 'payloads')
};

/**
 * @function start
 *  @param {Object} opts Options to start
 *  @param {function} callback Continuation to call
 * Starts a new instance of the registry mixing
 * in the config supplied
 * @returns {undefined}
 */
exports.start = function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  registry.start({
    ensure: true,
    config: {
      file: path.join(__dirname, '..', 'config.example.json'),
      overrides: extend(true, {}, defaultStart, opts)
    }
  }, callback);
};

//
// get around circular dep issue
//
var mocks = require('./mocks');

/**
 * @function integrationSetup
 *  @param {Object} opts Options for full integration setup
 *  @param {function} callback Continuation when setup
 * Simple helper to do integration
 * @returns {undefined}
 */
exports.integrationSetup = function (opts, callback) {
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = { app: defaultAppOpts, registry: defaultRegOpts };
  }
  opts.app = extend(true, {}, defaultAppOpts, opts.app);
  opts.registry = extend(true, {}, defaultRegOpts, opts.registry);

  async.parallel({
    app: async.apply(exports.start, opts.app),
    registry: async.apply(mocks.registry, opts.registry)
  }, callback);
};

/**
 * @function eTagFor
 *  @param {String} file Filename to read and get etag for
 *  @param {function} callback Continuation when finished
 * Responds with the etag for the particular payload `file`.
 * @returns {undefined}
 */
exports.etagFor = function (file, callback) {
  var fullpath = path.join(exports.dirs.payloads, file + '.json');
  fs.readFile(fullpath, 'utf8', function (err, data) {
    if (err) { return callback(err); }

    var payload = data.slice(0, data.indexOf('_attachments"')) +
      '_attachments":{}}';

    callback(null, etag(payload));
  });
};

/**
 * @function cleanupPublish
 *  @param {slay.App} app Fully formed app object
 *  @param {Object} options Configuration for cleanup
 * Return a function that cleans up a publish that was made
 * @returns {function} cleanup execution
 */
exports.cleanupPublish = function (app, options) {
  options = options || {
    name: 'my-package',
    file: path.join(exports.dirs.payloads, 'my-package-0.0.1.json')
  };

  return function (callback) {
    async.series([
      app.models.Package.remove.bind(app.models.Package, { name: options.name }),
      function (next) {
        var json = require(options.file);
        var versionNumber = Object.keys(json.versions)[0];
        app.models.Version.remove({
          versionId: [json.name, versionNumber].join('@')
        }, next);
      }
    ], callback);
  };
};
