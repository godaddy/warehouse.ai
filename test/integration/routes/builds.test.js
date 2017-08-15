/* eslint no-sync: 0*/
/* eslint max-nested-callbacks: 0*/
'use strict';

var fs = require('fs'),
  url = require('url'),
  path = require('path'),
  zlib = require('zlib'),
  http = require('http'),
  hock = require('hock'),
  async = require('async'),
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
describe.skip('/builds/*', function () {
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
    mock = hock.createHock(),
    carpenter,
    app;

  fs.writeFileSync(gzip, zlib.gzipSync(fs.readFileSync(content)));

  before(function (next) {
    helpers.start({ http: 0 }, function (err, ret) {
      assume(err).is.falsey();
      app = ret;

      carpenter = http.createServer(mock.handler);
      carpenter.listen(1337, next);
    });
  });

  after(function (next) {
    app.close(function () {
      carpenter.close(next);
    });
  });

  beforeEach(function (next) {
    app.bffs.publish(spec, publishOptions, next);
  });

  afterEach(function (next) {
    app.bffs.unpublish(spec, function () {
      async.each(app.bffs.envs, function (env, next) {
        var mine = JSON.parse(JSON.stringify(spec));

        mine.name = mine.name + ':all';
        mine.env = env;

        app.bffs.unpublish(mine, next);
      }, next);
    });
  });

  it('returns an error for invalid envs', function (next) {
    request(address(app, {
      pathname: 'builds/pkgname/trolface/0.0.0/'
    }), function (err, res, body) {
      assume(err).to.be.falsey();
      assume(res.statusCode).equals(500);
      assume(body.toString()).includes('Incorrect environment requested');

      next();
    });
  });

  it('returns a 404 when a build is not found for a given env', function (next) {
    request(address(app, {
      pathname: 'builds/pancake/prod/0.0.1/'
    }), function (err, res, body) {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return next(e);
      }

      assume(err).to.be.falsey();
      assume(res.statusCode).equals(404);
      assume(res.headers['content-type']).includes('application/json');
      assume(body.message).includes('Build not found');

      next();
    });
  });

  it('returns build data for the matching env', function (next) {
    request(address(app, {
      pathname: 'builds/pancake/test/0.0.1/'
    }), function (err, res, body) {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return next(e);
      }

      assume(err).to.be.falsey();
      assume(res.statusCode).equals(200);
      assume(res.headers['content-type']).includes('application/json');

      assume(body.name).equals('pancake');
      assume(body.version).equals('0.0.1');
      assume(body.env).equals('test');
      assume(body.files).is.an('array');
      assume(body.recommended).is.an('array');

      async.each(body.files, (file, next) => {
        request({
          uri: file,
          strictSSL: false
        }, function (err, res, body) {
          if (err) return next(err);

          assume(body).to.eql(fs.readFileSync(content, 'utf8'));
          next();
        });
      }, next);
    });
  });

  it('cancels active builds on carpenter instances', function (next) {
    mock
      .get('/cancel/pancake/0.0.1/test')
      .reply(200, 'cancelled');

    request(address(app, {
      pathname: 'builds/cancel/pancake/test/0.0.1'
    }), function (err, res, body) {
      assume(err).to.be.falsey();
      assume(res.statusCode).equals(200);
      assume(res.headers['transfer-encoding']).includes('chunked');
      assume(body).equals('cancelled');

      next();
    });
  });

  it('returns builds for every environment', function (next) {
    spec.env = 'dev';

    app.bffs.publish(spec, publishOptions, function (err) {
      if (err) return next(err);
      request(address(app, {
        pathname: 'builds/-/meta/pancake/0.0.1'
      }), function (err, res, body) {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return next(e);
        }
        assume(err).to.be.falsey();
        assume(res.statusCode).equals(200);
        assume(res.headers['content-type']).includes('application/json');

        assume(body.name).to.equal('pancake');
        assume(body.version).to.equal('0.0.1');
        assume(body.envs).is.an('object');
        for (const env of Object.keys(body.envs)) {
          assume(['test', 'dev']).contains(env);
          const data = body.envs[env];
          for (const finger of data.fingerprints) {
            assume(finger).contains('3x4mp311d');
          }
        }
        next();
      });
    });
  });
});
