/* eslint no-sync: 0*/
'use strict';

var url = require('url'),
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

describe('?debug=*', function () {
  var app;

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

  it('serves a JSON response for ?debug=* safe 404 for css files', function (next) {
    var uri = address(app, {
      pathname: 'assets/ishouldexist.css',
      query: { debug: '*' }
    });

    request(uri, function (err, res, body) {
      assume(err).doesnt.exist();
      assume(res.statusCode).equals(404);
      assume(res.headers['content-type']).equals('application/json');
      assume(body.toString()).includes('"content-type"');

      next();
    });
  });
});
