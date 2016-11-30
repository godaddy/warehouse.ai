'use strict';

var HttpAgent = require('http').Agent;
var HttpsAgent = require('https').Agent;

var defaults = {
  keepAlive: true
};

/**
 * @param {slay.App} app - Global app object
 * @param {Object} options - Additional options if used
 * @param {function} done - Continuation function
 * @returns {undefined}
 */
module.exports = function (app, options, done) {
  var opts = options.agent || app.config.get('agent') || defaults;
  var http = new HttpAgent(opts);
  var https = new HttpsAgent(opts);

  app.agents = {
    'https:': https,
    'http:': http,
    'http': http,
    'https': https
  };
  done();
};
