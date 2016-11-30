'use strict';

var async = require('async'),
    assume = require('assume'),
    request = require('request'),
    mocks = require('../../mocks'),
    helpers = require('../../helpers');

describe('npm routes', function () {
  var app,
      registry;

  before(function (done) {
    helpers.integrationSetup({
      app: {
        http: 8092,
        npm: {
          urls: {
            read: 'http://npm.host.invalid',
            write: {
              default: 'http://npm.host.invalid'
            }
          }
        }
      },
      registry: {
        http: 8099
      }
    }, function (err, result) {
      assume(err).to.be.falsey();
      app = result.app;
      registry = result.registry;
      app.carpenter = app.publisher.carpenter = mocks.carpenter;
      done();
    });
  });

  describe('having no connection to npm', function () {
    it('handles ECONN', function (done) {
      request({
        method: 'POST',
        uri: 'http://localhost:8092/',
        json: true
      }, function (err, res) {
        assume(err).is.falsey();
        assume(res.statusCode).equals(500);
        done();
      });
    });
  });

  after(function (done) {
    async.series([
      app.close.bind(app),
      registry.close.bind(registry)
    ], done);
  });
});
