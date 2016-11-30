'use strict';

var BFFS = require('bffs');
var extend = require('extend');

module.exports = function (app, options, done) {
  app.bffs = new BFFS(extend({
    datastar: app.datastar,
    models: app.models
  }, app.config.get('bffs')));

  done();
};
