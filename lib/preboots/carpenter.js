'use strict';

var url = require('url');
var Carpenter = require('carpenter-api-client');

module.exports = function preboot(app, options, done) {
  var uri = app.config.get('builder').url;
  var proto = uri.protocol || url.parse(uri).protocol;

  app.carpenter = new Carpenter({
    uri: uri,
    agent: app.agents[proto]
  });

  done();
};
