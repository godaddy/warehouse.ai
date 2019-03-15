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

describe('/api-docs', function () {
  const context = {};
  let app;

  before(function (next) {
    helpers.integrationSetup(function (err, result) {
      assume(err).is.falsey();
      app = result.app;

      context.registry = result.registry;
      context.app = result.app;
      context.app.publisher.carpenter = mocks.carpenter;

      next();
    });
  });

  after(function (next) {
    async.series([
      context.app.close.bind(context.app),
      context.registry.close.bind(context.registry)
    ], next);
  });

  it('can get swagger docs', async function () {
    const response = await request({
      method: 'GET',
      uri: address(app, { pathname: '/api-docs' })
    });

    assume(response).to.be.truthy();
  });

  it('can get swagger config', async function () {
    const response = await request({
      method: 'GET',
      uri: address(app, { pathname: '/api-docs/swagger-ui-init.js' })
    });

    assume(response).to.be.truthy();
    assume(response).to.include('Warehouse.ai');
    [
      '"/assets/files/{pkg}/{env}/{version}"',
      '"/builds/-/head"',
      '"/builds/-/meta/{pkg}/{version}"',
      '"/builds"',
      '"/builds/cancel/{pkg}/{version}/{env}"',
      '"/builds/{pkg}"',
      '"/builds/{pkg}/{env}"',
      '"/builds/{pkg}/{env}/{version}"',
      '"/healthcheck"',
      '"/packages/search"',
      '"/packages"',
      '"/packages/{pkg}"',
      '"/promote/{pkg}/{env}/{version}"',
      '"/{pkg}/-rev/{rev}"',
      '"/-/package/{pkg}/dist-tags"',
      '"/-/package/{pkg}/dist-tags/{tag}"',
      '"/release-line/{pkg}"',
      '"/release-line/{pkg}/{version}"',
      '"/{pkg}"'
    ].forEach(route => assume(response).to.include(route));
  });
});
