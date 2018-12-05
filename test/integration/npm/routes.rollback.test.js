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
    app;

  var jsContent = path.join(__dirname, 'routes.test.js'),
    jsGzip = path.join(require('os').tmpdir(), 'routes.test.js'),
    publishOptions = {
      files: [{
        content: jsContent,
        compressed: jsGzip,
        fingerprint: '3x4mp311d',
        filename: 'routes.test.js',
        extension: '.js'
      }]
    };

  fs.writeFileSync(jsGzip, zlib.gzipSync(fs.readFileSync(jsContent)));

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

      function publishOne({ name, version }) {
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
        return async.asyncify(app.release.create.bind(app.release, opts));
      }

      function createDep(opts) {
        return async.asyncify(app.release.dependent.add.bind(app.release.dependent, opts));
      }

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
        app.bffs.publish.bind(app.bffs, { name: 'parent-package', version: '0.0.1', env: 'test' }, publishOptions),
        app.bffs.publish.bind(app.bffs, { name: 'parent-package', version: '0.0.2', env: 'test' }, publishOptions),
        app.bffs.publish.bind(app.bffs, { name: 'child-package', version: '0.0.1', env: 'test' }, publishOptions),
        app.bffs.publish.bind(app.bffs, { name: 'child-package', version: '0.0.2', env: 'test' }, publishOptions)
      ], done);
    });
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


  after(function (done) {
    async.series([
      helpers.cleanupPublish(app),
      app.close.bind(app),
      registry.close.bind(registry)
    ], done);
  });
});
