const assume = require('assume');
const request = require('request-promise-native');
const async = require('async');
const url = require('url');
const helpers = require('../../helpers');
const mocks = require('../../mocks');

function address(app, properties) {
  const socket = app.servers.http.address();
  return url.format(Object.assign({
    hostname: '127.0.0.1',
    port: socket.port,
    protocol: 'http'
  }, properties || {}));
}

describe('/release-line/*', function () {
  const context = {};
  let app;

  before(function (next) {
    helpers.integrationSetup(function (err, result) {
      assume(err).is.falsey();
      app = result.app;

      context.registry = result.registry;
      context.app = result.app;
      context.app.publisher.carpenter = mocks.carpenter;

      if (process.env.DEBUG) {
        context.app.datastar.connection.on('queryStarted', function () {
          console.log.apply(console, arguments);
        });
      }

      next();
    });
  });

  after(function (next) {
    async.series([
      context.app.close.bind(context.app),
      context.registry.close.bind(context.registry)
    ], next);
  });

  it('should return 404 with no release-line', async function () {
    try {
      await request({
        method: 'GET',
        json: true,
        uri: address(app, { pathname: 'release-line/pkg/1.0.0' })
      });
    } catch(ex) {
      assume(ex.message).contains('404');
    }
  });

  it('should return a release-line when it exists', async function () {
    const pkg = 'pkg';
    const version = '1.0.0';
    let body;

    try {
      await app.release.create({ pkg, version });
      body = await request({
        json: true,
        uri: address(app, { pathname: 'release-line/pkg/1.0.0' })
      });
      assume(body.pkg).equals(pkg);
      assume(body.version).equals(version);
      assume(body.dependents).is.an('object');
      assume(Object.keys(body.dependents)).has.length(0);
    } finally {
      await app.release.delete({ pkg, version });
    }
  });

});
