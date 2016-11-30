'use strict';
/* eslint: no-process-env: 0 */

var util = require('util'),
    url = require('url'),
    errs = require('errs'),
    httpProxy = require('http-proxy'),
    slay = require('slay');

/**
 * @constructor App
 *  @param {string} root - Root directory of app
 *  @param {Object} options - configuration options
 * @returns {undefined}
 */
var App = module.exports = function App(root, options) {
  slay.App.call(this, root, options);

  this.env = process.env.NODE_ENV || 'development';
  this.after('close', this._onClose.bind(this));
  //
  // Setup our application proxy instance, mainly for making request
  // to our npm target.
  //
  // TODO: these options should be more configurable.
  //
  this.httpProxy = httpProxy.createProxy({
    changeOrigin: true,
    secure: false
  });

  this.agents = {};
};

util.inherits(App, slay.App);

/*
 * function npmProxy (req, res, next)
 * Attempts to proxy the specified `req` and `res` to a known
 * npm target.
 *
 * Remark: this is a *prototypal* method for performance reasons.
 */
App.prototype.npmProxy = function (req, res, next) {
  var self = this;
  var attempt;

  if (!this._npmTarget) {
    attempt = this.config.get('npm:urls:read');
    if (!attempt) {
      return next(errs.create({
        message: 'Not found: ' + req.url,
        status: 404
      }));
    }

    this._npmTarget = attempt;
  }

  req.log.info('Proxy to npm', {
    target: this._npmTarget,
    headers: req.headers,
    url: req.url
  });

  //
  // This should be handled cleaner in http-proxy when the target has auth
  // but that may be a breaking change so lets manually do it here FOR NOW.
  //
  var parsed = url.parse(this._npmTarget);
  var auth = parsed.auth;
  var proto = parsed.protocol;

  //
  // TODO: Check the set of know npm proxy targets
  // and to not continue iff. the req.url does not
  // match those routes.
  //
  this.httpProxy.web(req, res, {
    auth: auth,
    target: this._npmTarget,
    agent: this.agents[proto]
  }, function httpProxyError(e) {
    self.log.error('Proxy to npm', {
      error: e.message,
      target: self._npmTarget,
      headers: req.headers,
      url: req.url
    });

    next(e);
  });
};

/**
 * @function _onClose
 *  @param {slay.App} app - App object
 *  @param {Object} options - Options Object
 *  @param {function} next - continuation object
 * Closes any open Cassandra connections and agents associated with this instance.
 * Used by the slay `close` interceptor.
 * @returns {undefined}
 */
App.prototype._onClose = function (app, options, next) {
  if (!this.datastar) return;

  Object.keys(this.agents).forEach(key => {
    this.agents[key].destroy();
  });

  this.datastar.close(next);
};
