/* eslint no-process-env: 0*/
'use strict';

var path = require('path'),
  url = require('url'),
  assume = require('assume'),
  concat = require('concat-stream'),
  diagnostics = require('diagnostics'),
  mocks = require('../../mocks'),
  macros = require('../../macros'),
  dirs = require('../../helpers').dirs;

var Publisher = mocks.publisher();
var FileRequest = mocks.FileRequest;

/**
 * function assumePublisher(opts)
 * @param {Object} opts - Options for assertion
 * Simple macro which asserts a value Publisher instance.
 * @returns {function} assertion function
 */
function assumePublisher(opts) {
  return function () {
    var publisher = new Publisher(opts);
    assume(publisher).is.a('object');
    assume(publisher.npm).is.a('object');
    assume(publisher.checkScript).is.a('string');
    assume(publisher.cluster).is.a('object');
  };
}

describe('npm/publisher.js', function () {
  var actualConfig = require(path.join(__dirname, '..', '..', '..', 'config.example.json'));
  var env = process.env.NODE_ENV || 'development';
  var config;

  before(function () {
    config = require(path.join(dirs.config,  env + '.json'));
    config.log = actualConfig.log = diagnostics('warehouse:test');
    config.log.error = actualConfig.log.error = diagnostics('warehouse:test:error');
    config.log.info = actualConfig.log.info = diagnostics('warehouse:test:info');
    config.carpenter = actualConfig.carpenter = mocks.carpenter;
    config.models = actualConfig.models = mocks.models();
  });

  describe('Publisher', function () {
    it('new (undefined)', assumePublisher());
    it('new (validOptions)', assumePublisher(config));
  });

  it('setup()', function () {
    var publisher = new Publisher(config);
    publisher.setup();
    assume(publisher.request).is.a('function');
  });

  it('spawn(data)', function () {
    var publisher = new Publisher(config);
    var data = {
      payload: 'test-package',
      check: 'test-check'
    };

    var child = publisher.spawn(data);
    assume(child.received).deep.equals([data]);
  });

  it('properly concats URI when publishing to npm', function () {
    var publisher = new Publisher(actualConfig);
    publisher.setup();
    var req = publisher.toNpm(publisher.getTarget('foo'), '{}', {
      url: '/foo',
      headers: {}
    });

    var parsed = url.parse(req.uri);
    assume(req.headers.host).equals(parsed.host);
  });

  //
  // These tests are mocked to verify that the
  // data pipechain is functioning under a variety of
  // conditions. So they do not require HTTP or actual
  // child processes, but everything is a proper stream.
  //
  describe('verify', function () {
    var name = 'npm-publish-split-stream';
    var version = '0.0.0';
    var payload = path.join(dirs.payloads, name + '-' + version + '.json');

    it('passes through a simple package passing checks', function (done) {
      //
      // Create our Publisher instance and get the proxy
      // HTTP requests made in the pipechain so that we
      // may assert that the correct data was written later on.
      //
      var outbound;
      var expected = {
        body: JSON.stringify({ success: true }),
        headers: { 'mock-header': true },
        statusMessage: 'mocked',
        statusCode: 201
      };

      var publisher = mocks.publisher({
        config: config,
        response: expected,
        onHttpProxy: function (hyperReq) {
          outbound = hyperReq;
        }
      });

      //
      // Setup our mocks that represent our `http.IncomingMessage`
      // and http.ServerResponse streams.
      //
      var req = new FileRequest({ file: payload, url: '/' + name });
      var res = concat({ encoding: 'string' }, function (data) {
        //
        // When the test is over we need to assert three things:
        // 1. The `outbound` HTTP request had the JSON contents of our
        //    file payload written to it.
        // 2. The final HTTP `res` (i.e. what will be written to
        //    the `npm` CLI) matches the `body` we mocked.
        // 3. The final HTTP `res` also has the same `statusCode`,
        //    `statusMessage` and `headers`.
        //
        assume(req.content).equals(outbound.content);
        assume(data).deep.equals(expected.body, 'Invalid mock response.');
        assume(res.statusCode).equals(expected.statusCode);
        assume(res.statusMessage).equals(expected.statusMessage);
        assume(res.headers).deep.equals(expected.headers);
        done();
      });

      res.writeHead = function (status, message, headers) {
        res.statusCode = status;
        res.statusMessage = message;
        res.headers = headers;
      };

      publisher.verify(req, res, macros.notInvoked(
        'Publisher.verify callback invoked incorrectly'
      ));
    });

    it('passes errors on in the middleware chain', function (done) {
      //
      // Create our Publisher instance and make our outbound http
      // proxy request throw an error.
      //
      var expected = new Error('ECONNREFUSED MOCK');
      var publisher = mocks.publisher({
        config: config,
        onHttpProxy: function (outbound) {
          outbound.on('response', function () {
            outbound.emit('error', expected);
          });
        }
      });

      //
      // Setup our mocks that represent our `http.IncomingMessage`
      // and http.ServerResponse streams.
      //
      var req = new FileRequest({ file: payload, url: '/' + name });
      var res = concat({ encoding: 'string' }, function () {
        assume(false).equals(true, 'Should not get a response on error');
      });

      publisher.verify(req, res, function (err) {
        assume(err.message).equals(expected.message, 'Incorrect error returned: \n' + err.stack);
        done();
      });
    });
  });
});
