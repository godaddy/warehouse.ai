'use strict';

var LoadingBay = require('../loading-bay');

module.exports = function (app, options, done) {
  app.bay = new LoadingBay({
    redis: app.config.get('redis'),
    PackageCache: app.models.PackageCache,
    log: options.log || app.log
  });

  done();
};
