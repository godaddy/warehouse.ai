'use strict';

var assume = require('assume'),
  url = require('url'),
  path = require('path'),
  hyperquest = require('hyperquest'),
  concat = require('concat-stream'),
  registry = require('../../lib');

function address(app, properties) {
  const socket = app.servers.http.address();
  return url.format(Object.assign({
    hostname: '127.0.0.1',
    port: socket.port,
    protocol: 'http'
  }, properties || {}));
}
var configFile = path.join(__dirname, '..', '..', 'config.example.json');
describe('App (integration)', function () {
  it('should start with the given override port by default', function (done) {
    registry.start({
      log: { level: 'critical' },
      ensure: true,
      auth: false,
      config: {
        file: configFile,
        overrides: {
          http: {
            hostname: '127.0.0.1',
            port: 0
          }
        }
      }
    }, function (err, app) {
      assume(err).equals(null);
      assume(app).truthy();
      assume(app.log).is.an('object');
      assume(app.config).is.an('object');
      assume(app.publisher).is.an('object');
      assume(app.models).is.an('object');
      assume(app.servers.http.address().port).is.a('number');
      app.close(done);
    });
  });

  it('should proxy to npm for "/"', function (done) {
    registry.start({
      log: { level: 'critical' },
      auth: false,
      config: {
        file: configFile,
        overrides: {
          http: {
            hostname: '127.0.0.1',
            port: 0
          }
        }
      }
    }, function (err, app) {
      assume(err).equals(null);
      assume(app).truthy();

      hyperquest(address(app))
        .pipe(concat({ encoding: 'string' }, function (data) {
          try {
            data = JSON.parse(data);
          } catch (ex) {
            assume(ex).falsy();
          }

          assume(data).is.an('object');
          assume(data.db_name).equals('registry');
          assume(data.doc_count).is.a('number');
          app.close(done);
        }));
    });
  });
});
