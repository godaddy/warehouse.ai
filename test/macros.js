/*eslint no-process-env: 0*/
'use strict';

var assume = require('assume'),
    path = require('path'),
    async = require('async'),
    hyperquest = require('hyperquest'),
    concat = require('concat-stream'),
    extend = require('extend'),
    request = require('request'),
    mocks = require('./mocks'),
    helpers = require('./helpers'),
    spawn = require('child_process').spawn;

var dirs = helpers.dirs;
/**
 * @function notInvoked
 *  @param {String} msg Error message
 * Returns a function which assumes that there was
 * no error
 * @returns {function} macro that assesses error condition
 */
exports.notInvoked = function (msg) {
  msg = msg || 'Error callback invoked';
  return function onError(err) {
    /*eslint no-undefined: 0*/
    var errorMsg = msg + ' (dumping inner stack):\n' + (err || {}).stack;
    assume(err).equals(undefined, errorMsg);
    assume(false).equals(true, msg);
  };
};

/**
 * @function hasDistTags
 *  @param {Object} options Configuration for macro
 * Returns a mocha `it` function that asserts the dist-tags
 * exist.
 * @returns {function} macro to confirm distTags exist as expected
 */
exports.hasDistTags = function (options) {
  var expect = options.expect;
  var host = options.host;
  var name = options.name;

  return function shouldHaveTags(done) {
    request({
      uri: host + '/-/package/' + name + '/dist-tags',
      json: true
    }, function (err, res, body) {
      assume(err).falsey();
      assume(res.statusCode).equals(200);
      assume(body).is.an('object');
      assume(body).deep.equals(expect);

      done();
    });
  };
};

/**
 * @function addDistTag
 *  @param {Object} options for expectation when adding dist tag
 * Returns a mocha `it` function that aseerts the dist-tag
 * was added correctly.
 * @returns {function} macro that executes test and asserts it worked
 */
exports.addDistTag = function (options) {
  var tag = options.tag;
  var host = options.host;
  var name = options.name;
  var version = options.version;

  //
  // Configure our expected assertion
  //
  var expect = {};
  expect[tag] = version;

  return function shouldAdd(done) {
    request({
      uri: host + '/-/package/' + name + '/dist-tags/' + tag,
      method: options.method || 'PUT',
      body: version,
      json: true
    }, function (err, res, body) {
      assume(err).is.falsey();
      assume(res.statusCode).equals(201);
      assume(body).is.an('object');
      assume(body).deep.equals(expect);

      done();
    });
  };
};

/**
 * @function publishOk
 *  @param {Object} context App context for this test
 *  @param {Object} opts Configuration
 * Returns a mocha `it` function that asserts the publish
 * of the specified payload is successful.
 * @returns {function} macro that tests that we can publish as expected
 */
exports.publishOk = function (context, opts) {
  var options = extend(true, {
    file: path.join(dirs.payloads, 'my-package-0.0.1.json'),
    publishUrl: 'http://localhost:8090/my-package',
    id: 'my-package@0.0.1',
    path: '/my-package'
  }, opts || {});

  return function shouldPublish(done) {
    var app = context.app;
    var registry = context.registry;
    var json = require(options.file);
    var request = new mocks.FileRequest({ file: options.file });

    //
    // Make sure our test widget is deleted from cache and is not a left-over of
    // some other failed test.
    //
    delete (registry.cache || {})[options.path];

    /**
     * @function assumeWriteOk
     *  @param {String} id Id of the publish
     * Asserts that the correct data was written to disk.
     * @returns {undefined}
     */
    function assumeWriteOk(id) {
      if (id !== options.id) {
        return;
      }

      var versionNumber = Object.keys(json.versions)[0];
      async.parallel({
        version: function (next) {
          app.models.Version.findOne({
            conditions: {
              versionId: json.name + '@' + versionNumber
            }
          }, next);
        },
        pkg: function (next) {
          app.models.Package.findOne({
            conditions: { name: json.name }
          }, next);
        }
      }, function (err, models) {
        assume(err).is.falsey();
        assume(models.version).is.not.falsey();
        assume(models.pkg).is.not.falsey();

        done();
      });
    }

    //
    // Listen for the consistent write.
    //
    app.publisher.once('publish:end', assumeWriteOk);
    request
      .pipe(hyperquest.put(options.publishUrl))
      .pipe(concat({ encoding: 'string' }, function (data) {
        assume(JSON.parse(data)).deep.equals({
          message: 'Cached data for: ' + options.path
        });

        assume(registry.cache[options.path])
          .equals(request.content);
      }));
  };
};

/**
 * @function spawnNpmTags
 *  @param {String} action Action to execute on CLI
 *  @param {String} name Name of package
 *  @param {String} tag Name of the tag
 *  @param {Number} port Port we are hitting
 *
 * @returns {ChildProcess} child of the spawned `npm`
 */
exports.spawnNpmTags = function (action, name, tag, port) {
  port = port || 8092;
  name = name || 'my-package';
  action = action || 'ls';

  var child = spawn('npm', [
    'dist-tags',
    action,
    name,
    tag,
    '--json',
    '--loglevel=http',
    '--registry=http://localhost:' + port,
    '--userconfig=' + path.join(__dirname, 'fixtures', 'mock-npmrc')
  ].filter(Boolean));

  if (process.env.DEBUG_NPM) {
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }

  return child;
};
