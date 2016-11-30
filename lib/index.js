'use strict';

var path = require('path');
var App = exports.App = require('./app');

/*
 * Create a new application and start it.
 */
exports.start = function (options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  var app = new App(path.join(__dirname, '..'), options);
  app.start(function (err) {
    if (err) { return callback(err); }
    callback(null, app);
  });
};
