const BuildManager = require('../build-manager');

module.exports = function managerboot(app, opts, done) {
  app.manager = new BuildManager({
    Version: app.models.Version,
    tagger: app.tagger,
    bffs: app.bffs,
    release: app.release,
    config: app.config,
    log: app.log,
    carpenter: app.carpenter
  });

  done();
};
