'use strict';

var assume = require('assume'),
  url = require('url'),
  path = require('path'),
  hyperquest = require('hyperquest'),
  concat = require('concat-stream'),
  registry = require('../../lib'),
  sinon = require('sinon'),
  request = require('request');

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

  it.only('should log query params', function (done) {
    var logs = [];
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

      sinon.stub(app.log, 'info').callsFake((...msg) => logs.push(msg));
      request(address(app, {
        pathname: 'assets/files/pancake/test/0.0.1'
      }), function (err, res, body) {
        assume(err).doesnt.exist();
        assume(res.statusCode).equals(200);

        assume(logs.length).is.greaterThan(0);

        app.close(done);
      });

    });
  });
});
