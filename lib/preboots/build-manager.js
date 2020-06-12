const BuildManager = require('../build-manager');
const path = require('path');
const { tmpdir } = require('os');

module.exports = function managerboot(app, opts, done) {
  app.manager = new BuildManager({
    Version: app.models.Version,
    Package: app.models.Package,
    tagger: app.tagger,
    bffs: app.bffs,
    release: app.release,
    config: app.config,
    log: app.log,
    carpenter: app.carpenter
  });

  const rootStoragePath = path.join(tmpdir(), 'pkg');
  app.rootStoragePath = rootStoragePath;

  done();
};
