/* eslint max-nested-callbacks: 0, no-sync: 0 */
'use strict';

var async = require('async'),
  assume = require('assume'),
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  mocks = require('../../mocks'),
  macros = require('../../macros'),
  helpers = require('../../helpers');

describe('npm routes', function () {
  var registry,
    app,
    jsContent = path.join(__dirname, 'routes.rollback.test.js'),
    jsGzip = path.join(require('os').tmpdir(), 'routes.rollback.test.js'),
    publishOptions = {
      files: [{
        content: jsContent,
        compressed: jsGzip,
        fingerprint: '3x4mp311d',
        filename: 'routes.rollback.test.js',
        extension: '.js'
      }]
    },
    cleanupWork = [];

  fs.writeFileSync(jsGzip, zlib.gzipSync(fs.readFileSync(jsContent)));

  function publishOne({ name, version }) {
    cleanupWork.unshift(helpers.cleanupPublish(app, {
      name,
      file: path.join(helpers.dirs.payloads, `${name}-${version}.json`)
    }));
    return macros.publishOk({
      app: app,
      registry: registry
    }, {
      file: path.join(helpers.dirs.payloads, `${name}-${version}.json`),
      publishUrl: `http://localhost:8092/${name}`,
      id: `${name}@${version}`,
      path: `/${name}`
    });
  }

  function createRelease(opts) {
    cleanupWork.unshift(async.asyncify(app.release.delete.bind(app.release, opts)));
    return async.asyncify(app.release.create.bind(app.release, opts));
  }

  function createDep(opts) {
    cleanupWork.unshift(async.asyncify(app.release.dependent.remove.bind(app.release.dependent, opts)));
    return async.asyncify(app.release.dependent.add.bind(app.release.dependent, opts));
  }

  function createBuild(opts) {
    cleanupWork.unshift(app.bffs.unpublish.bind(app.bffs, opts));
    return app.bffs.publish.bind(app.bffs, opts, publishOptions);
  }

  before(function (done) {
    helpers.integrationSetup({
      app: {
        http: 8092,
        npm: {
          urls: {
            read: 'http://localhost:8093',
            write: {
              default: 'http://localhost:8093'
            }
          }
        }
      },
      registry: {
        http: 8093
      }
    }, function (err, result) {
      assume(err).to.be.falsey();
      registry = result.registry;
      app = result.app;
      app.carpenter = app.publisher.carpenter = mocks.carpenter;

      async.series([
        publishOne({ name: 'parent-package', version: '0.0.1' }),
        publishOne({ name: 'parent-package', version: '0.0.2' }),
        publishOne({ name: 'parent-package', version: '0.0.3' }),
        publishOne({ name: 'child-package', version: '0.0.1' }),
        publishOne({ name: 'child-package', version: '0.0.2' }),
        createRelease({ version: '0.0.1', pkg: 'parent-package' }),
        createRelease({ version: '0.0.2', pkg: 'parent-package' }),
        createRelease({ version: '0.0.1', pkg: 'child-package' }),
        createRelease({ version: '0.0.2', pkg: 'child-package' }),
        createDep({ pkg: 'parent-package', version: '0.0.1', dependent: 'child-package', dependentVersion: '0.0.1' }),
        createDep({ pkg: 'parent-package', version: '0.0.2', dependent: 'child-package', dependentVersion: '0.0.2' }),
        createBuild({ name: 'parent-package', version: '0.0.1', env: 'test' }, publishOptions),
        createBuild({ name: 'parent-package', version: '0.0.2', env: 'test' }, publishOptions),
        createBuild({ name: 'child-package', version: '0.0.1', env: 'test' }, publishOptions),
        createBuild({ name: 'child-package', version: '0.0.2', env: 'test' }, publishOptions)
      ], done);
    });
  });

  after(function (done) {
    async.series([
      ...cleanupWork,
      app.close.bind(app),
      registry.close.bind(registry)
    ], done);
  });

  // TODO: undo all that work in `after`

  it('can rollback release-lines', function (done) {
    macros.addDistTag({
      method: 'POST',
      host: 'http://localhost:8092',
      name: 'parent-package',
      tag: 'test',
      version: '0.0.1'
    })(function (err) {
      assume(err).is.falsey();
      setTimeout(function () {
        async.series([
          macros.hasDistTags({
            host: 'http://localhost:8092',
            name: 'child-package',
            expect: {
              latest: '0.0.2',
              test: '0.0.1'
            }
          }),
          macros.hasDistTags({
            host: 'http://localhost:8092',
            name: 'parent-package',
            expect: {
              latest: '0.0.3',
              test: '0.0.1'
            }
          })
        ], done);
      }, 100);
    });
  });

  it('leave child tagging to carpenterd if no build found', function (done) {
    macros.addDistTag({
      method: 'POST',
      host: 'http://localhost:8092',
      name: 'parent-package',
      tag: 'test',
      version: '0.0.3'
    })(function (err) {
      assume(err).is.falsey();
      setTimeout(function () {
        async.series([
          macros.hasDistTags({
            host: 'http://localhost:8092',
            name: 'child-package',
            expect: {
              latest: '0.0.2',
              test: '0.0.1'
            }
          }),
          macros.hasDistTags({
            host: 'http://localhost:8092',
            name: 'parent-package',
            expect: {
              latest: '0.0.3',
              test: '0.0.3'
            }
          })
        ], done);
      }, 100);
    });
  });
});
