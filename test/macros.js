/* eslint no-process-env: 0*/
'use strict';

var assume = require('assume'),
  path = require('path'),
  async = require('async'),
  hyperquest = require('hyperquest'),
  concat = require('concat-stream'),
  extend = require('extend'),
  request = require('request'),
  url = require('url'),
  mocks = require('./mocks'),
  helpers = require('./helpers'),
  fs = require('fs'),
  tmp = require('tmp'),
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
    /* eslint no-undefined: 0*/
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

  if (options.auth) {
    const parsed = url.parse(options.publishUrl);
    parsed.auth = `${options.auth.user}:${options.auth.password}`;
    options.publishUrl = url.format(parsed);
  }

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
            name: json.name,
            version: versionNumber
          }, next);
        },
        pkg: function (next) {
          app.models.Package.findOne({
            name: json.name
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

// creates a new server to test against
// takes starting npmrc copies to a tmp file
// runs npm command w/ args against tmp file userconfig
// - has blank globalconfig
// npmrc files can use variables:
// - $PORT : testing server port
// - $TOKEN : the generatedToken
const blank = path.join(__dirname, 'fixtures', 'npm-auth', 'blank.npmrc');
exports.testNPM = function testNPM(registry, options, cb) {
  options = options || {};
  const teardown = options.teardown;
  const expected =  options.expected || {};
  const stdinFile =  options.stdinFile || blank;
  const command = options.command;
  const expectedExit =  options.expectedExit || 0;
  const args =  options.args || [];
  const startingNpmrc =  options.startingNpmrc || blank;
  const expectedNpmrc =  options.expectedNpmrc || blank;

  function interpolate(buf) {
    return buf.toString().replace(/\$(?:$|PORT|TOKEN)/g, (token) => {
      return {
        $: '$',
        PORT: 8090,
        TOKEN: expected.generatedToken
      }[token.slice(1)];
    });
  }

  tmp.file((tmpConfigErr, tmpNpmrc, fd, cleanup) => {
    assume(tmpConfigErr).to.be.falsey();
    teardown(() => cleanup());
    tmp.dir({
      unsafeCleanup: true
    }, (tmpCacheErr, tmpNpmcache, cleanup) => {
      assume(tmpCacheErr).to.be.falsey();
      teardown(() => cleanup());
      let expectedBody;
      try {
        fs.writeFileSync(tmpNpmrc, interpolate(fs.readFileSync(startingNpmrc))); // eslint-disable-line no-sync
        expectedBody = interpolate(fs.readFileSync(expectedNpmrc)); // eslint-disable-line no-sync
      } catch (e) {
        return void cb(e);
      }
      const pid = spawn('npm', [
        `--registry=http://127.0.0.1:8090`,
        `--userconfig=${tmpNpmrc}`,
        `--globalconfig=${blank}`,
        `--loglevel=silent`,
        `--cache=${tmpNpmcache}`,
        command
      ].concat(args), {
        // npm demands stdout/err be a tty
        // stdio: ['pipe', 'inherit', 'inherit'],
        env: {
          PATH: process.env.PATH// eslint-disable-line no-process-env
        }
      });

      fs.createReadStream(stdinFile).pipe(pid.stdin);
      pid.on('exit', (code) => {
        assume(code).equals(expectedExit);
        let foundBody;
        try {
          foundBody = fs.readFileSync(tmpNpmrc).toString(); // eslint-disable-line no-sync
        } catch (e) {
          return void cb(e);
        }
        assume(foundBody).equals(expectedBody);
        cb(null);
      });
    });
  });
};
