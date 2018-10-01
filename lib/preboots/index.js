'use strict';
/* eslint no-sync: 0 */

var winston = require('winston');
//
// Load all preboot instances, order matters here as some instances might depend
// on eachother.
//
module.exports = function (app, options, done) {
  const auth = options.auth === false ? options.auth :  app.config.get('auth');

  app.preboot(require('slay-config')());
  app.preboot(require('slay-log')({
    transports: [
      new (winston.transports.Console)({
        raw: app.env !== 'local'
      })
    ]
  }));

  app.preboot(require('./wrhs-models'));
  app.preboot(require('./release-line'));
  app.preboot(require('./bffs'));
  app.preboot(require('./loading-bay'));
  app.preboot(require('./agents'));
  app.preboot(require('./carpenter'));
  app.preboot(require('./spec'));
  if (auth !== false) app.preboot(require('authboot')());
  app.preboot(require('./npm-auth'));
  app.preboot(require('../npm/preboot'));

  done();
};
