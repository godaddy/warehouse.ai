'use strict';

const Publisher = require('./publisher');
const Tagger = require('./tagger');

module.exports = function (app, options, done) {
  //
  // TODO: ensure that the necessary config values are
  // present for npm verification and proxying before
  // continuing.
  //
  app.publisher = new Publisher({
    npm: app.config.get('npm'),
    auth: app.npmAuthMiddleware,
    carpenter: app.carpenter,
    agents: app.agents,
    models: app.models,
    log: app.log
  }).setup();

  app.tagger = new Tagger({
    npm: app.config.get('npm'),
    models: app.models,
    log: app.log
  });

  done();
};
