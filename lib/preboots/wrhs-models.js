'use strict';

var Datastar = require('datastar');

/**
 * @function models
 *  @param {slay.App} app - the global app instance
 *  @param {Object} options - for extra configurability
 *  @param {function} done - continuation when preboot is finished
 * Attaches all models to the `app` instance as `app.models`.
 * @returns {undefined}
 */
module.exports = function models(app, options, done) {
  //
  // Get the regular config unless we are in prod where it doesnt exist
  //
  var ensure = app.config.get('ensure') || options.ensure;
  var datastar = new Datastar(app.config.get('database') || {
    config: app.config.get('cassandra')
  });

  app.datastar = datastar;
  app.models = require('warehouse-models')(datastar);
  if (!ensure) return datastar.connect(done);
  datastar.connect(err => {
    if (err) return done(err);
    app.models.ensure(done);
  });
};
