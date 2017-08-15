'use strict';

var Publisher = require('./publisher'),
  Tagger = require('./tagger');

module.exports = function (app, options, done) {
  //
  // TODO: ensure that the necessary config values are
  // present for npm verification and proxying before
  // continuing.
  //
  // TODO: require checks somehow based on the strings
  // stored in `app.config.get('npm.checks')`.
  //
  app.publisher = new Publisher({
    npm: app.config.get('npm'),
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
