/* eslint no-sync: 0*/
'use strict';

var fs = require('fs'),
  url = require('url'),
  path = require('path'),
  zlib = require('zlib'),
  assume = require('assume'),
  request = require('request'),
  helpers = require('../../helpers');

function address(app, properties) {
  const socket = app.servers.http.address();
  return url.format(Object.assign({
    hostname: '127.0.0.1',
    port: socket.port,
    protocol: 'http'
  }, properties || {}));
}

describe('/assets/*', function () {
  this.timeout(12E4);
  var jsContent = path.join(__dirname, 'builds.test.js'),
    jsGzip = path.join(require('os').tmpdir(), 'build.test.js'),
    cssContent = path.join(__dirname, '..', '..', 'fixtures', 'payloads', 'my-styles.css'),
    cssGzip = path.join(require('os').tmpdir(), 'my-styles.css'),
    spec = { name: 'pancake', version: '0.0.1', env: 'test' },
    publishOptions = {
      files: [{
        content: jsContent,
        compressed: jsGzip,
        fingerprint: '3x4mp311d',
        filename: 'builds.test.js',
        extension: '.js'
      }, {
        content: cssContent,
        compressed: cssGzip,
        fingerprint: '3x4mp311e',
        filename: 'my-styles.css',
        extension: '.css'
      }]
    },
    app;

  fs.writeFileSync(jsGzip, zlib.gzipSync(fs.readFileSync(jsContent)));
  fs.writeFileSync(cssGzip, zlib.gzipSync(fs.readFileSync(cssContent)));

  before(function (next) {
    helpers.appIntegrationSetup({ http: 0 }, function (err, ret) {
      assume(err).is.falsey();
      app = ret;
      next();
    });
  });

  after(function (next) {
    app.close(next);
  });

  beforeEach(function (next) {
    app.bffs.publish(spec, publishOptions, next);
  });

  afterEach(function (next) {
    app.bffs.unpublish(spec, next);
  });

  it('has a bffs instance', function () {
    assume(app.bffs).is.a('object');
  });

  describe('/assets/files/*', function () {
    it('serves files for a given build', function (next) {
      request(address(app, {
        pathname: 'assets/files/pancake/test/0.0.1'
      }), function (err, res, body) {
        assume(err).doesnt.exist();
        assume(res.statusCode).equals(200);
        assume(res.headers['content-type']).equals('application/json; charset=utf-8');
        const jsonBody = JSON.parse(body);
        assume(jsonBody.files).exist();
        assume(jsonBody.files).has.length(2);
        assume(body.toString()).includes('/builds.test.js');

        next();
      });
    });
    it('responds with a 404 when appropriate', function (next) {
      request(address(app, {
        pathname: 'assets/files/pancake/test/0.0.2'
      }), function (err, res) {
        assume(err).doesnt.exist();
        assume(res.statusCode).equals(404);

        next();
      });
    });
    it('accepts a filter to match filenames', function (next) {
      request(address(app, {
        pathname: 'assets/files/pancake/test/0.0.1',
        query: { filter: 'css' }
      }), function (err, res, body) {
        assume(err).doesnt.exist();
        assume(res.statusCode).equals(200);
        assume(res.headers['content-type']).equals('application/json; charset=utf-8');
        const jsonBody = JSON.parse(body);
        assume(jsonBody.files).exist();
        assume(jsonBody.files).has.length(1);
        assume(body.toString()).includes('/my-styles.css');
        assume(body.toString()).doesnt.includes('/builds.test.js');

        next();
      });
    });
    it('ignores case in filter parameters', function (next) {
      request(address(app, {
        pathname: 'assets/files/pancake/test/0.0.1',
        query: { filter: 'CSS' }
      }), function (err, res, body) {
        assume(err).doesnt.exist();
        assume(res.statusCode).equals(200);
        assume(res.headers['content-type']).equals('application/json; charset=utf-8');
        const jsonBody = JSON.parse(body);
        assume(jsonBody.files).exist();
        assume(jsonBody.files).has.length(1);
        assume(body.toString()).includes('/my-styles.css');
        assume(body.toString()).doesnt.includes('/builds.test.js');

        next();
      });
    });
    it('responds with 400 when filter is greater than 50 chars', function (next) {
      request(address(app, {
        pathname: 'assets/files/pancake/test/0.0.1',
        query: { filter: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz' }
      }), function (err, res) {
        assume(err).doesnt.exist();
        assume(res.statusCode).equals(400);
        assume(res.headers['content-type']).equals('application/json; charset=utf-8');

        next();
      });
    });
  });
});
