const nock = require('nock');
const req = require('request-promise-native');
const assume = require('assume');
const async = require('async');
const url = require('url');
const sinon = require('sinon');
const helpers = require('../../helpers');
const macros = require('../../macros');
const mocks = require('../../mocks');

function address(app, properties) {
  const socket = app.servers.http.address();
  return url.format(Object.assign({
    hostname: '127.0.0.1',
    port: socket.port,
    protocol: 'http'
  }, properties || {}));
}

describe('/promote/*', function () {
  this.timeout(6E4);

  const name = 'my-package';
  const mock = nock('http://127.0.0.1:1337');
  let app, registry;

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

  it('PATCH /promote/:pkg/:env/:version returns 400 with bad version', async () => {
    try {
      await req({
        method: 'PATCH',
        uri: address(app, {
          pathname: `promote/${name}/test/what`
        })
      });
    } catch (ex) {
      assume(ex.statusCode).equals(400);
    }
  });

  it('PATCH /promote/:pkg/:env/:version calls rollback to do a promote, this should change', async () => {

    const spy = sinon.spy(app.manager, 'promote');
    const res = await req({
      method: 'PATCH',
      uri: address(app, {
        pathname: `promote/${name}/test/0.0.1`
      }),
      resolveWithFullResponse: true
    });
    assume(res.statusCode).equals(204);
    assume(spy.callCount).equals(1);
  });

  it('PATCH /promote/:pkg/:env/:version?build=true builds and passes promote as true', async () => {
    mock.post('/v2/build')
      .reply(200, mocks.carpenterBuildResponse());

    const spy = sinon.spy(app.manager, 'promoteOrBuild');
    const res = await req({
      method: 'PATCH',
      uri: address(app, {
        pathname: `promote/${name}/test/0.0.1`,
        query: { build: true }
      }),
      resolveWithFullResponse: true
    });
    assume(res.statusCode).equals(204);
    assume(spy.callCount).equals(1);
  });
});
