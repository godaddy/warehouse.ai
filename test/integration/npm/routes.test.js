/* eslint max-nested-callbacks: 0, no-sync: 0 */
'use strict';

var async = require('async'),
  assume = require('assume'),
  request = require('request'),
  mocks = require('../../mocks'),
  macros = require('../../macros'),
  helpers = require('../../helpers');

describe('npm routes', function () {
  var name = 'my-package',
    registry,
    app;

  before(function (done) {
    helpers.integrationSetup({
      app: {
        http: 8092,
        npm: {
          urls: {
            read: 'http://localhost:8093',
            write: {
              default: 'http://localhost:8093'
            }
          }
        }
      },
      registry: {
        http: 8093
      }
    }, function (err, result) {
      assume(err).to.be.falsey();
      registry = result.registry;
      app = result.app;
      app.carpenter = app.publisher.carpenter = mocks.carpenter;

      macros.publishOk({
        app: app,
        registry: registry
      }, {
        publishUrl: 'http://localhost:8092/' + name
      })(done);
    });
  });

  describe('dist-tag', function () {
    describe('HTTP API', function () {
      it('add dist-tag (PUT /-/package/:name/dist-tags/:tag)', macros.addDistTag({
        host: 'http://localhost:8092',
        name: name,
        tag: 'test',
        version: '0.0.1'
      }));

      it('remove dist-tag (DELETE /-/package/:name/dist-tags/:tag)', function (done) {
        request({
          method: 'DELETE',
          uri: 'http://localhost:8092/-/package/' + name + '/dist-tags/test',
          json: true
        }, function (err, res, body) {
          assume(err).falsey();
          assume(res.statusCode).equals(204);
          assume(body).doesnt.exist();
          done();
        });
      });

      it('list after tag removed (GET /-/package/:name/dist-tags)', macros.hasDistTags({
        host: 'http://localhost:8092',
        name: name,
        expect: {
          latest: '0.0.1',
          test: null
        }
      }));

      it('add dist-tag (POST /-/package/:name/dist-tags/:tag)', macros.addDistTag({
        method: 'POST',
        host: 'http://localhost:8092',
        name: name,
        tag: 'test',
        version: '0.0.1'
      }));

      it('list dist-tags (GET /-/package/:name/dist-tags)', macros.hasDistTags({
        host: 'http://localhost:8092',
        name: name,
        expect: {
          latest: '0.0.1',
          test: '0.0.1'
        }
      }));

      it('purposefully 400 (PUT /-/package/:name/dist-tags)', function (done) {
        request({
          method: 'PUT',
          uri: 'http://localhost:8092/-/package/' + name + '/dist-tags',
          json: true
        }, function (err, res, body) {
          assume(err).is.falsey();
          assume(res.statusCode).equals(400);
          assume(body).is.an('object');
          assume(body).deep.equals({ message: 'Not implemented' });
          done();
        });
      });

      it('purposefully 400 (POST /-/package/:name/dist-tags)', function (done) {
        request({
          method: 'POST',
          uri: 'http://localhost:8092/-/package/' + name + '/dist-tags',
          json: true
        }, function (err, res, body) {
          assume(err).is.falsey();
          assume(res.statusCode).equals(400);
          assume(body).is.an('object');
          assume(body).deep.equals({ message: 'Not implemented' });
          done();
        });
      });
    });

    describe('npm CLI', function () {
      var expected, npm;

      before(macros.addDistTag({
        host: 'http://localhost:8092',
        name: name,
        tag: 'test',
        version: '0.0.1'
      }));

      beforeEach(function () {
        expected = '';
      });

      function toString(data) {
        expected += data.toString();
      }

      it('npm dist-tag ls', function (done) {
        npm = macros.spawnNpmTags();

        npm.stdout.on('data', toString);
        npm.once('close', function (code) {
          assume(code).to.equal(0);
          assume(expected).to.include('latest: 0.0.1');
          assume(expected).to.include('test: 0.0.1');

          done();
        });
      });

      it('npm dist-tag for an unknown package@version will return an error', function (done) {
        npm = macros.spawnNpmTags('add', 'unknown-widget@999.0.0 ', 'prod');

        npm.stderr.on('data', toString);
        npm.once('close', function (code) {
          assume(code).to.equal(1);

          assume(expected).to.include('npm ERR! 404 Not Found - GET http://localhost:8092/-/package/unknown-widget/dist-tags');
          assume(expected).to.include('\'unknown-widget@999.0.0 \' is not in the npm registry.');

          done();
        });
      });

      it('npm dist-tag add <pkg>@<version> <tag>', function (done) {
        npm = macros.spawnNpmTags('add', 'my-package@0.0.1', 'prod');

        npm.stdout.on('data', toString);
        npm.once('close', function (code) {
          assume(code).to.equal(0);
          assume(expected).to.include('+prod: my-package@0.0.1');

          done();
        });
      });

      it('npm dist-tag rm <pkg> <tag>', function (done) {
        npm = macros.spawnNpmTags('rm', 'my-package', 'prod');

        npm.stdout.on('data', toString);
        npm.once('close', function (code) {
          assume(code).to.equal(0);
          assume(expected).to.include('-prod: my-package@0.0.1');

          done();
        });
      });
    });
  });

  describe('install', function () {
    before(macros.addDistTag({
      host: 'http://localhost:8092',
      name: name,
      tag: 'test',
      version: '0.0.1'
    }));

    describe('HTTP API', function () {
      it('fetch package in default env (GET /:pkg)', function (done) {
        request({
          uri: 'http://localhost:8092/my-package',
          json: true
        }, function (err, res, body) {
          assume(err).falsey();
          assume(res.statusCode).equals(200);

          //
          // TODO: this should be an `assume` plugin because it
          // will be used in multiple places.
          //
          assume(body).is.an('object');
          assume(body.name).equals('my-package');
          assume(body.description).equals('A kind of package');
          assume(body['dist-tags']).deep.equals({ latest: '0.0.1' });
          assume(body.versions['0.0.1'].peerDependencies).deep.equals({
            react: '*'
          });

          done();
        });
      });

      it('serves 304 with the correct etag (GET /:pkg)', function (done) {
        helpers.etagFor('my-package-0.0.1', function (err, etag) {
          assume(err).is.falsey();
          request({
            uri: 'http://localhost:8092/my-package',
            headers: { 'if-none-match': etag },
            json: true
          }, function (err, res, body) {
            assume(err).falsey();
            assume(res.statusCode).equals(304);
            assume(body).doesnt.exist();
            done();
          });
        });
      });
    });

    //
    // TODO: write tests that spawn an `npm` client
    //
    describe('npm CLI', function () {
      it('npm install (200)');
      it('npm install (304)');
    });
  });

  after(function (done) {
    async.series([
      helpers.cleanupPublish(app),
      app.close.bind(app),
      registry.close.bind(registry)
    ], done);
  });
});
