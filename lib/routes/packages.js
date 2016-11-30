'use strict';

/**
 * @function setup
 *  @param {slay.App} app - global app object
 * Adds non-npm package routes for working with packages
 * and package metadata
 * @returns {undefined}
 */
module.exports = function (app) {
  //
  // ### /packages/search?type='any-type'&locale='en-US'
  // Returns the packages matching the query string parameters
  //
  app.routes.post('/packages/search', function (req, res, next) {
    //
    // Currently we only fetch by tag
    //
    var type = app.params.type;
    app.bay.get(type, function (err, packages) {
      if (err) { return next(err); }

      res.status(200).json(packages);
    });
  });
};
