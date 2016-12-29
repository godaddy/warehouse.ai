/*eslint no-sync: 0*/
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

//
// TODO: Need testing config for publishing to s3 to store encrypted with
// travis
//
describe.skip('/assets/*', function () {
  var content = path.join(__dirname, 'builds.test.js'),
      gzip = path.join(require('os').tmpdir(), 'build.test.js'),
      spec = { name: 'pancake', version: '0.0.1', env: 'test' },
      publishOptions = {
        files: [{
          content: content,
          compressed: gzip,
          fingerprint: '3x4mp311d',
          filename: 'builds.test.js',
          extension: '.js'
        }]
      },
      app;

  fs.writeFileSync(gzip, zlib.gzipSync(fs.readFileSync(content)));

  before(function (next) {
    helpers.start({ http: 0 }, function (err, ret) {
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

  it('serves a safe 404 for css files', function (next) {
    request(address(app, {
      pathname: 'assets/ishouldexist.css'
    }), function (err, res, body) {
      assume(err).doesnt.exist();
      assume(res.statusCode).equals(404);
      assume(res.headers['content-type']).equals('text/css; charset=utf-8');
      assume(body.toString()).includes('* Build not found');

      next();
    });
  });

  it('serves a safe 404 for js files', function (next) {
    request(address(app, {
      pathname: 'assets/ishouldexist.js'
    }), function (err, res, body) {
      assume(err).doesnt.exist();
      assume(res.statusCode).equals(404);
      assume(res.headers['content-type']).equals('application/javascript; charset=utf-8');
      assume(body.toString()).includes('* Build not found');

      next();
    });
  });

  it('serves the specified build', function (next) {
    request(address(app, {
      pathname: 'assets/3x4mp311d.js'
    }), function (err, res, body) {
      assume(err).doesnt.exist();
      assume(res.statusCode).equals(200);
      assume(res.headers['content-type']).includes('application/javascript');
      assume(body).deep.equals(fs.readFileSync(content, 'utf8'));

      next();
    });
  });

  it.skip('serves gzip responses', function (next) {
    request({
      url: address(app, { pathname: 'assets/3x4mp311d.js' }),
      headers: {
        'Accept-Encoding': 'gzip'
      }
    }, function (err, res, body) {
      assume(err).doesnt.exist();
      assume(res.statusCode).equals(200);
      assume(res.headers['content-type']).includes('application/javascript');
      assume(res.headers['content-encoding']).equals('gzip');
      assume(body).deep.equals(fs.readFileSync(gzip, 'utf8'));

      next();
    });
  });
});
