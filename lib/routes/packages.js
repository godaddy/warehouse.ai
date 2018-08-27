'use strict';
const stringify = require('stringify-stream');

const stringifyOpts = { open: '[', close: ']' };

/**
 * @function setup
 *  @param {slay.App} app - global app object
 * Adds non-npm package routes for working with packages
 * and package metadata
 * @returns {undefined}
 */
module.exports = function (app) {
  const auth = app.middlewares.auth;
  //
  // ### /packages/search?type='any-type'&locale='en-US'
  // Returns the packages matching the query string parameters
  //
  app.routes.post('/packages/search', auth, function (req, res, next) {
    if (!app.bay) return res.status(500).json({ error: 'Not configured' });
    //
    // Currently we only fetch by tag
    //
    var type = app.params.type;
    app.bay.get(type, function (err, packages) {
      if (err) { return next(err); }

      res.status(200).json(packages);
    });
  });

  //
  // ### /packages
  // Returns a list of information about all tracked packages
  //
  app.routes.get('/packages', auth, function (req, res, next) {
    app.models.PackageCache.findAll({})
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify(stringifyOpts))
      .pipe(res);
  });

  //
  // ### /packages/:pkg
  // Returns information about the given package
  //
  app.routes.get('/packages/:pkg', auth, function (req, res, next) {
    app.models.PackageCache.findOne({ partitioner: 'cached', name: req.params.pkg })
      .once('error', err => {
        err.status = 500;
        next(err);
      })
      .pipe(stringify())
      .pipe(res);
  });
};
