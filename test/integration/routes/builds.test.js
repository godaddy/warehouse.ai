/* eslint no-sync:0, max-nested-callbacks:0, no-undefined:0*/
'use strict';

var fs = require('fs'),
  url = require('url'),
  path = require('path'),
  zlib = require('zlib'),
  async = require('async'),
  assume = require('assume'),
  request = require('request'),
  macros = require('../../macros'),
  helpers = require('../../helpers'),
  mocks = require('../../mocks'),
  nock = require('nock'),
  sinon = require('sinon'),
  req = require('request-promise-native');

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
describe('/builds/*', function () {
  this.timeout(3E4);
  var content = path.join(__dirname, 'builds.test.js'),
    gzip = path.join(require('os').tmpdir(), 'build.test.js'),
    spec = { name: 'pancake', version: '0.0.1', env: 'test' },
    publishOptions = {
      files: [{
        content: content, // path
        compressed: gzip, // path
        fingerprint: '3x4mp311d',
        filename: 'builds.test.js',
        extension: '.js'
      }]
    },
    name = 'my-package',
    mock = nock('http://127.0.0.1:1337'),
    registry,
    app;



  fs.writeFileSync(gzip, zlib.gzipSync(fs.readFileSync(content)));

  before(function (done) {
    helpers.integrationSetup({
      app: {
        log: { level: 'critical' },
        http: { host: '0.0.0.0', port: 0 },
        auth: false,
        npm: {
          urls: {
            read: 'http://localhost:8002',
            write: {
              default: 'http://localhost:8002'
            }
          }
        }
      },
      registry: {
        http: 8002
      }
    }, function (err, ret) {
      assume(err).is.falsey();
      app = ret.app;
      registry = ret.registry;

      macros.publishOk({
        app,
        registry
      }, {
        publishUrl: address(app, { pathname: name })
      })(done);
    });
  });

  after(function (next) {
    async.series([
      helpers.cleanupPublish(app),
      app.close.bind(app),
      registry.close.bind(registry)
    ], next);
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
      assume(body.recommended).equals(undefined);

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

  describe('PUT /builds/:pkg/:env?', function () {
    afterEach(function (next) {
      // cleans up records and unpublishes fully built asset payload
      const fullyBuiltAssetSpec = {
        name: 'willowtestpackageload',
        version: '1.0.0',
        env: 'dev'
      };
      async.series([
        helpers.cleanupPublish(app, { name, file: path.join(helpers.dirs.payloads, 'built-asset.json') }),
        function (cb) {
          app.bffs.unpublish(fullyBuiltAssetSpec, (err) => {
            cb();
          });
        }
      ], next);
    });
    it('PUT /builds/:pkg/ can put a built payload', async () => {
      const testPkg = JSON.parse(fs.readFileSync('test/fixtures/payloads/built-asset.json', 'utf-8'));
      const res = await req({
        method: 'PUT',
        uri: address(app, {
          pathname: `builds/${name}/`
        }),
        json: testPkg,
        resolveWithFullResponse: true
      });
      assume(res.statusCode).equals(204);
    });
  });


  it('PATCH /builds/:pkg/:env/:version gives 400 with bad version', async () => {
    try {
      await req({
        method: 'PATCH',
        uri: address(app, {
          pathname: `builds/${name}/test/what`
        })
      });
    } catch (ex) {
      assume(ex.statusCode).equals(400);
    }
  });

  it('PATCH /builds/:pkg/:env/:version generates a build similar to dist-tag', async () => {
    mock.post('/v2/build')
      .reply(200, mocks.carpenterBuildResponse());

    const spy = sinon.spy(app.manager, 'build');
    const res = await req({
      method: 'PATCH',
      uri: address(app, {
        pathname: `builds/${name}/test/0.0.1`
      }),
      resolveWithFullResponse: true
    });
    assume(res.statusCode).equals(204);
    assume(spy.callCount).equals(1);
    assume(spy.args[0][0].promote).equals(false);
  });

  it('PATCH /builds/:pkg/:env/:version with promote query string generates a build and passes promote: true', async () => {
    mock.post('/v2/build')
      .reply(200, mocks.carpenterBuildResponse());

    const spy = sinon.spy(app.manager, 'promoteOrBuild');
    const res = await req({
      method: 'PATCH',
      uri: address(app, {
        pathname: `builds/${name}/test/0.0.1`,
        query: { promote: true }
      }),
      resolveWithFullResponse: true
    });
    assume(res.statusCode).equals(204);
    assume(spy.callCount).equals(1);
    assume(spy.args[0][0].promote).equals(true);
  });

});
